// The e-mail queue behind stored notifications (T-053). The cron route calls runEmailQueue with
// the service-role store; tests call processEmailQueue with fakes. Rules:
// - at most `limit` e-mails per run, oldest due first;
// - the first try plus three retries (5, 20 and 80 minutes later), each failure kept in email_error;
// - a member who left, or has no e-mail, is never mailed (email_wanted becomes false);
// - the notification id is the idempotency key, so a run that crashes after sending can't send twice;
// - what was withdrawn or already decided before the run is not mailed (T-055): email_error "withdrawn";
// - each e-mail is in the recipient's own language (T-057), Czech when it isn't known.
import { renderNotificationEmail, type NotificationRow } from "@/lib/notification-email";
import type { SendEmailInput, SendEmailResult } from "@/lib/email.server";

/** Tries in all: the first send and three retries. */
export const MAX_ATTEMPTS = 4;
const BACKOFF_MINUTES = [5, 20, 80];

export interface QueuedNotification extends NotificationRow {
  recipient_member_id: string | null;
  recipient_user_id: string | null;
  recipient_email: string | null;
  email_attempts: number;
  sender_user_id?: string | null;
  dedupe_key?: string | null;
}

export type EmailLang = "cs" | "en";

export interface QueueStore {
  due(limit: number, now: Date): Promise<QueuedNotification[]>;
  /** The member's e-mail, or null when they left, have no sign-in or no e-mail. */
  memberEmail(memberId: string): Promise<string | null>;
  userEmail(userId: string): Promise<string | null>;
  /** False when the subject of the notification no longer stands (T-055). */
  stillStands(n: QueuedNotification): Promise<boolean>;
  /** The recipient's language, or null when unknown (T-057). */
  languageOf(n: QueuedNotification): Promise<EmailLang | null>;
  sent(id: string, at: Date): Promise<void>;
  failed(id: string, attempts: number, nextAt: Date, error: string): Promise<void>;
  skipped(id: string, reason: string): Promise<void>;
}

export type Sender = (input: SendEmailInput) => Promise<SendEmailResult>;

export interface QueueReport {
  sent: number;
  failed: number;
  skipped: number;
}

export function nextAttemptAt(now: Date, attemptsSoFar: number): Date {
  const minutes = BACKOFF_MINUTES[Math.min(attemptsSoFar - 1, BACKOFF_MINUTES.length - 1)] ?? 80;
  return new Date(now.getTime() + minutes * 60_000);
}

async function addressOf(store: QueueStore, n: QueuedNotification): Promise<string | null> {
  if (n.recipient_member_id) return store.memberEmail(n.recipient_member_id);
  if (n.recipient_user_id) return store.userEmail(n.recipient_user_id);
  return n.recipient_email;
}

export async function processEmailQueue(
  store: QueueStore,
  send: Sender,
  opts: { now?: Date; limit?: number } = {},
): Promise<QueueReport> {
  const now = opts.now ?? new Date();
  const report: QueueReport = { sent: 0, failed: 0, skipped: 0 };
  for (const n of await store.due(opts.limit ?? 50, now)) {
    const data = renderNotificationEmail(n);
    if (!data) {
      await store.skipped(n.id, `unknown_kind:${n.kind}`);
      report.skipped++;
      continue;
    }
    let to: string | null;
    let lang: EmailLang | null;
    try {
      if (!(await store.stillStands(n))) {
        await store.skipped(n.id, "withdrawn");
        report.skipped++;
        continue;
      }
      to = await addressOf(store, n);
      lang = await store.languageOf(n);
    } catch (e) {
      const attempts = n.email_attempts + 1;
      await store.failed(n.id, attempts, nextAttemptAt(now, attempts), `address: ${message(e)}`);
      report.failed++;
      continue;
    }
    if (!to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
      await store.skipped(n.id, "no_recipient");
      report.skipped++;
      continue;
    }
    let result: Awaited<ReturnType<Sender>>;
    try {
      result = await send({
        to,
        template: "notification",
        data,
        lang: lang ?? "cs",
        idempotencyKey: n.id,
      });
    } catch (e) {
      const attempts = n.email_attempts + 1;
      await store.failed(n.id, attempts, nextAttemptAt(now, attempts), message(e));
      report.failed++;
      continue;
    }
    // Recording the outcome is outside the send's try: a failed update after a successful send
    // must not count as a send failure (the run stops with an error instead, and the next run's
    // retry carries the same idempotency key, so Lovable drops the duplicate).
    if (result.sent) {
      await store.sent(n.id, now);
      report.sent++;
    } else {
      await store.skipped(n.id, result.reason);
      report.skipped++;
    }
  }
  return report;
}

function message(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  return m.slice(0, 500);
}

/** The real store: the service-role client, which bypasses RLS. Server-only. */
export async function supabaseQueueStore(): Promise<QueueStore> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const check = (error: { message: string } | null, what: string) => {
    if (error) throw new Error(`${what}: ${error.message}`);
  };
  return {
    async due(limit, now) {
      const { data, error } = await supabaseAdmin
        .from("notifications")
        .select(
          "id, kind, payload, recipient_member_id, recipient_user_id, recipient_email, email_attempts, sender_user_id, dedupe_key",
        )
        .is("emailed_at", null)
        .eq("email_wanted", true)
        .lt("email_attempts", MAX_ATTEMPTS)
        .lte("email_next_at", now.toISOString())
        .order("email_next_at")
        .limit(limit);
      check(error, "due");
      return (data ?? []) as QueuedNotification[];
    },
    async memberEmail(memberId) {
      const { data, error } = await supabaseAdmin
        .from("members")
        .select("email, user_id, left_at")
        .eq("id", memberId)
        .maybeSingle();
      check(error, "member");
      if (!data || data.left_at || !data.user_id) return null;
      return data.email?.trim() || null;
    },
    async userEmail(userId) {
      const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (error) throw new Error(`user: ${error.message}`);
      return data.user?.email ?? null;
    },
    async stillStands(n) {
      const p = (n.payload ?? {}) as Record<string, unknown>;
      const id = (v: unknown) => (typeof v === "string" ? v : "");
      const one = async (table: string, key: string, value: string, col = "status") => {
        if (!value) return null;
        const { data, error } = await supabaseAdmin
          .from(table as "bookings")
          .select(col)
          .eq(key, value)
          .maybeSingle();
        check(error, `${table} state`);
        return (data as Record<string, unknown> | null) ?? null;
      };
      switch (n.kind) {
        case "booking_awaiting_approval": {
          const b = await one("bookings", "id", id(p["booking_id"]));
          return !!b && b["status"] === "PENDING";
        }
        case "ownership_offered": {
          const o = await one("ownership_offers", "id", id(p["offer_id"]));
          return !!o && o["status"] === "PENDING";
        }
        case "invitation": {
          // dedupe_key is "invitation:<invitation id>" (0038).
          const invId = (n.dedupe_key ?? "").startsWith("invitation:")
            ? (n.dedupe_key ?? "").slice(11)
            : "";
          const i = await one("invitations", "id", invId, "status, expires_at");
          if (!invId) return true;
          return (
            !!i &&
            i["status"] === "PENDING" &&
            (!i["expires_at"] || String(i["expires_at"]) > new Date().toISOString())
          );
        }
        case "payment_claimed": {
          const c = await one("payment_claims", "id", id(p["claim_id"]));
          return !!c && c["status"] === "PENDING";
        }
        default:
          return true;
      }
    },
    async languageOf(n) {
      const prefOf = async (userId: string | null | undefined) => {
        if (!userId) return null;
        const { data, error } = await supabaseAdmin
          .from("profiles")
          .select("preferred_lang")
          .eq("user_id", userId)
          .maybeSingle();
        check(error, "language");
        const l = data?.preferred_lang;
        return l === "en" || l === "cs" ? l : null;
      };
      if (n.recipient_member_id) {
        const { data, error } = await supabaseAdmin
          .from("members")
          .select("user_id")
          .eq("id", n.recipient_member_id)
          .maybeSingle();
        check(error, "member language");
        return prefOf(data?.user_id);
      }
      if (n.recipient_user_id) return prefOf(n.recipient_user_id);
      if (n.recipient_email) {
        // Someone with an account: their own choice; otherwise the inviter's language.
        const { data, error } = await supabaseAdmin.rpc("email_lang", {
          _email: n.recipient_email,
        });
        check(error, "email language");
        if (data === "en" || data === "cs") return data;
        return prefOf(n.sender_user_id);
      }
      return null;
    },
    async sent(id, at) {
      const { error } = await supabaseAdmin
        .from("notifications")
        .update({ emailed_at: at.toISOString(), email_error: null })
        .eq("id", id);
      check(error, "sent");
    },
    async failed(id, attempts, nextAt, err) {
      const { error } = await supabaseAdmin
        .from("notifications")
        .update({ email_attempts: attempts, email_next_at: nextAt.toISOString(), email_error: err })
        .eq("id", id);
      check(error, "failed");
    },
    async skipped(id, reason) {
      const { error } = await supabaseAdmin
        .from("notifications")
        .update({ email_wanted: false, email_error: reason })
        .eq("id", id);
      check(error, "skipped");
    },
  };
}

export async function runEmailQueue(): Promise<QueueReport> {
  const { sendEmail } = await import("@/lib/email.server");
  return processEmailQueue(await supabaseQueueStore(), sendEmail);
}

// Inviting several people at once, and sending the link from the admin's own mail app until
// the app sends email itself (T-005).

const EMAIL = /^[^\s@,;<>()"]+@[^\s@,;<>()"]+\.[^\s@,;<>()"]{2,}$/;

/** Splits pasted text (commas, semicolons, spaces, new lines, "Name <a@b.cz>") into emails. */
export function parseEmails(text: string): { valid: string[]; invalid: string[] } {
  const parts = text
    .split(/[\s,;]+/)
    .map((p) => p.replace(/^<|>$/g, "").trim().toLowerCase())
    .filter((p) => p.includes("@"));
  const valid: string[] = [];
  const invalid: string[] = [];
  for (const p of parts) {
    if (!EMAIL.test(p)) invalid.push(p);
    else if (!valid.includes(p)) valid.push(p);
  }
  return { valid, invalid };
}

export function inviteLink(origin: string, token: string): string {
  return `${origin}/pozvanka/${token}`;
}

/** A mailto: link with a ready Czech + English message; opens the admin's mail app. */
export function inviteMailto(opts: {
  /** One address, or several (a batch with one shared link). */
  to: string | string[];
  link: string;
  chata: string;
  inviter?: string | null | undefined;
  admin: boolean;
}): string {
  const who = opts.inviter ? `${opts.inviter} vás zve` : "Zveme vás";
  const whoEn = opts.inviter ? `${opts.inviter} invites you` : "You're invited";
  const roleCs = opts.admin ? " jako správce" : "";
  const roleEn = opts.admin ? " as an admin" : "";
  const subject = `Pozvánka do chaty ${opts.chata} / Invitation to ${opts.chata}`;
  const body = [
    `${who}${roleCs} do chaty ${opts.chata} v aplikaci My Chata.`,
    `Pozvánku přijmete zde (platí 7 dní):`,
    opts.link,
    "",
    `${whoEn}${roleEn} to ${opts.chata} on My Chata.`,
    `Accept here (valid for 7 days):`,
    opts.link,
  ].join("\n");
  const q = `subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const list = (Array.isArray(opts.to) ? opts.to : [opts.to]).filter(Boolean);
  // Several people: Bcc, so no one sees the others' addresses (personal data).
  if (list.length > 1) return `mailto:?bcc=${list.map(encodeURIComponent).join(",")}&${q}`;
  return `mailto:${encodeURIComponent(list[0] ?? "")}?${q}`;
}

// ---------- Invitation batches (bugs 10–12, 17 Oct 2026) ----------

export interface InvitationRow {
  id: string;
  email: string | null;
  role: string;
  token: string;
  group_token?: string | null;
  property_id?: string | null;
  status: string;
  created_at: string;
  expires_at: string;
  created_by_member_id?: string | null;
}

export interface InvitationBatch {
  key: string;
  /** The one link for everyone on the batch; null for batches made before group links. */
  groupToken: string | null;
  rows: InvitationRow[];
  createdAt: string;
  expiresAt: string;
  /** Still waiting, link still valid. */
  pending: InvitationRow[];
  /** Waiting, but the link ran out. */
  expired: InvitationRow[];
  accepted: InvitationRow[];
  state: "active" | "expired" | "closed";
  admin: boolean;
}

/**
 * Groups invitation rows into the batches they were made in: by group_token, or for older
 * rows by the moment and person that made them (one insert gives every row the same time).
 * Newest first. "active": someone can still join; "expired": people never joined and the
 * link ran out; "closed": everyone joined or was cancelled.
 */
export function groupInvitations(rows: InvitationRow[], now: Date = new Date()): InvitationBatch[] {
  const map = new Map<string, InvitationRow[]>();
  for (const r of rows) {
    const key = r.group_token
      ? `g:${r.group_token}`
      : `t:${r.created_at}|${r.created_by_member_id ?? ""}`;
    map.set(key, [...(map.get(key) ?? []), r]);
  }
  const at = now.getTime();
  const batches: InvitationBatch[] = [];
  for (const [key, list] of map) {
    const sorted = [...list].sort((a, b) => (a.email ?? "").localeCompare(b.email ?? ""));
    const waiting = sorted.filter((r) => r.status === "PENDING");
    const pending = waiting.filter((r) => new Date(r.expires_at).getTime() > at);
    const expired = waiting.filter((r) => new Date(r.expires_at).getTime() <= at);
    const accepted = sorted.filter((r) => r.status === "ACCEPTED");
    batches.push({
      key,
      groupToken: sorted[0]?.group_token ?? null,
      rows: sorted,
      createdAt: sorted.reduce(
        (m, r) => (r.created_at < m ? r.created_at : m),
        sorted[0]!.created_at,
      ),
      expiresAt: sorted.reduce(
        (m, r) => (r.expires_at > m ? r.expires_at : m),
        sorted[0]!.expires_at,
      ),
      pending,
      expired,
      accepted,
      state: pending.length ? "active" : expired.length ? "expired" : "closed",
      admin: sorted.some(
        (r) => r.role.toUpperCase() === "ADMIN" || r.role.toUpperCase() === "OWNER",
      ),
    });
  }
  return batches.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Whole days from now until `iso` (negative once past), rounded towards "less time left". */
export function daysUntil(iso: string, now: Date = new Date()): number {
  return Math.floor((new Date(iso).getTime() - now.getTime()) / 86_400_000);
}

/** Calendar days from today until the day of `iso`, in local time: a 7-day link made now
 *  says "7 days", not "6" (F-17). 0 means it ends today. */
export function calendarDaysUntil(iso: string, now: Date = new Date()): number {
  const end = new Date(iso);
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((endDay.getTime() - today.getTime()) / 86_400_000);
}

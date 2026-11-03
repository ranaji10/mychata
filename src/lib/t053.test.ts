// T-053: e-mail text per kind, the e-mail queue (fake store and sender, never a real address),
// and stored notifications in the Notifications list.
import { describe, expect, it } from "vitest";
import { render } from "@react-email/render";
import * as React from "react";
import { buildNotifications, type NotificationInput } from "@/lib/notification-list";
import { renderNotificationEmail, type StoredNotificationKind } from "@/lib/notification-email";
import {
  MAX_ATTEMPTS,
  nextAttemptAt,
  processEmailQueue,
  type QueueStore,
  type QueuedNotification,
  type Sender,
} from "@/lib/notification-queue.server";
import { template } from "@/lib/email-templates/notification";
import type { Booking } from "@/lib/data";

const payloads: Record<StoredNotificationKind, Record<string, unknown>> = {
  invitation: {
    token: "abc123",
    property_name: "Chata Alfa",
    invited_by: "Anna",
    expires_at: "2026-11-10T10:00:00Z",
  },
  booking_awaiting_approval: {
    booking_id: "b1",
    property_name: "Chata Alfa",
    requester_name: "Petr",
    start_date: "2026-11-20",
    end_date: "2026-11-22",
  },
  booking_decided: {
    booking_id: "b1",
    approved: true,
    property_name: "Chata Alfa",
    start_date: "2026-11-20",
    end_date: "2026-11-22",
    decided_by: "Anna",
  },
  guest_request_decided: {
    approved: false,
    property_name: "Chata Alfa",
    start_date: "2026-12-01",
    end_date: "2026-12-03",
    calendar_token: "tok_1",
  },
  ownership_offered: { offer_id: "o1", account_name: "Rodina A", from_name: "Anna" },
  task_mentioned: {
    task_id: "t1",
    task_title: "Opravit okap",
    task_title_en: "Fix the gutter",
    author_name: "Anna",
    excerpt: "Prosím mrkni\n\nna to",
    property_name: "Chata Alfa",
  },
  leaving_checklist: {
    property_name: "Chata Alfa",
    from_name: "Anna",
    submitted_at: "2026-11-03T09:00:00Z",
    done: ["Zamknout"],
    skipped: [{ item: "Voda", reason: "zamrzlá" }],
    note: "Klíč u souseda",
    start_date: "2026-11-05",
    end_date: "2026-11-07",
  },
  message_to_admin: { from_name: "Petr", account_name: "Rodina A", body: "Prosím o klíč" },
  debt_reminder: { from_name: "Anna", amount: 1500, property_name: "Chata Alfa" },
};

describe("e-mail text", () => {
  for (const [kind, payload] of Object.entries(payloads)) {
    it(`${kind}: Czech and English, no names in the subject, a mychata.cz link`, () => {
      const e = renderNotificationEmail({ id: "n1", kind, payload })!;
      expect(e).not.toBeNull();
      expect(e.heading[0]).toBeTruthy();
      expect(e.heading[1]).toBeTruthy();
      expect(e.subject).toMatch(/ · /);
      for (const name of ["Anna", "Petr"]) expect(e.subject).not.toContain(name);
      expect(e.url.startsWith("https://mychata.cz")).toBe(true);
      for (const [cs] of e.paragraphs) expect(cs).not.toMatch(/\n/);
    });
  }

  it("builds links from ids, never from free text", () => {
    const e = renderNotificationEmail({
      id: "n1",
      kind: "invitation",
      payload: { token: "../../evil.example/x?y=1" },
    })!;
    expect(e.url).toBe("https://mychata.cz/pozvanka/evilexamplexy1");
  });

  it("lists done and skipped handover items with the reason", () => {
    const e = renderNotificationEmail({
      id: "n1",
      kind: "leaving_checklist",
      payload: payloads.leaving_checklist,
    })!;
    const text = e.paragraphs.map((p) => p[0]).join(" ");
    expect(text).toContain("Hotovo: Zamknout.");
    expect(text).toContain("Nehotovo: Voda (zamrzlá).");
    expect(text).toContain("Klíč u souseda");
  });

  it("unknown kinds render nothing", () => {
    expect(renderNotificationEmail({ id: "n1", kind: "newsletter", payload: {} })).toBeNull();
  });

  it("the template pairs Czech and English paragraphs, keeping a Czech-only one", async () => {
    const html = await render(
      React.createElement(template.component, {
        heading: "Ahoj",
        headingEn: "Hello",
        paragraph: "První\n\nDruhý\n\nTřetí",
        paragraphEn: "First\n\n\n\nThird",
        buttonLabel: "Otevřít",
        buttonLabelEn: "Open",
        buttonUrl: "https://mychata.cz/x",
      }),
      { plainText: true },
    );
    expect(html.indexOf("První")).toBeLessThan(html.indexOf("First"));
    expect(html.indexOf("First")).toBeLessThan(html.indexOf("Druhý"));
    expect(html.indexOf("Třetí")).toBeLessThan(html.indexOf("Third"));
    expect(html).toContain("Otevřít · Open");
  });
});

function fakeStore(rows: QueuedNotification[], emails: Record<string, string | null> = {}) {
  const log: string[] = [];
  const store: QueueStore = {
    async due(limit) {
      return rows.slice(0, limit);
    },
    async memberEmail(id) {
      return emails[id] ?? null;
    },
    async userEmail(id) {
      if (id === "broken") throw new Error("auth down");
      return emails[id] ?? null;
    },
    async sent(id) {
      log.push(`sent:${id}`);
    },
    async failed(id, attempts, nextAt, error) {
      log.push(`failed:${id}:${attempts}:${nextAt.toISOString()}:${error}`);
    },
    async skipped(id, reason) {
      log.push(`skipped:${id}:${reason}`);
    },
  };
  return { store, log };
}

const row = (id: string, over: Partial<QueuedNotification> = {}): QueuedNotification => ({
  id,
  kind: "debt_reminder",
  payload: payloads.debt_reminder,
  recipient_member_id: "m1",
  recipient_user_id: null,
  recipient_email: null,
  email_attempts: 0,
  ...over,
});

describe("e-mail queue", () => {
  const now = new Date("2026-11-03T10:00:00Z");

  it("sends to the member's address with the notification id as idempotency key", async () => {
    const { store, log } = fakeStore([row("n1")], { m1: "petr@example.org" });
    const calls: { to: string; key: string; subject: string }[] = [];
    const send: Sender = async (i) => {
      calls.push({ to: i.to, key: i.idempotencyKey, subject: i.data.subject });
      return { sent: true };
    };
    expect(await processEmailQueue(store, send, { now })).toEqual({
      sent: 1,
      failed: 0,
      skipped: 0,
    });
    expect(calls).toEqual([
      {
        to: "petr@example.org",
        key: "n1",
        subject: "Připomínka vyrovnání · A reminder to settle up",
      },
    ]);
    expect(log).toEqual(["sent:n1"]);
  });

  it("never mails a member who left or has no e-mail; addresses for guests and visitors", async () => {
    const { store, log } = fakeStore(
      [
        row("left"),
        row("guest", { recipient_member_id: null, recipient_email: "host@example.org" }),
        row("visitor", { recipient_member_id: null, recipient_user_id: "u1" }),
      ],
      { m1: null, u1: "visitor@example.test" },
    );
    const to: string[] = [];
    const r = await processEmailQueue(store, async (i) => (to.push(i.to), { sent: true }), { now });
    expect(r).toEqual({ sent: 2, failed: 0, skipped: 1 });
    expect(to).toEqual(["host@example.org", "visitor@example.test"]);
    expect(log[0]).toBe("skipped:left:no_recipient");
  });

  it("a failure is recorded with backoff; a suppressed address is not retried", async () => {
    const { store, log } = fakeStore(
      [
        row("a", { email_attempts: 0 }),
        row("b", { email_attempts: 2 }),
        row("c", { recipient_member_id: null, recipient_user_id: "broken" }),
        row("d"),
      ],
      { m1: "petr@example.org" },
    );
    let n = 0;
    const send: Sender = async () => {
      n++;
      if (n === 1) throw new Error("rate limited by provider");
      if (n === 2) throw new Error("timeout");
      return { sent: false, reason: "recipient_suppressed" };
    };
    expect(await processEmailQueue(store, send, { now })).toEqual({
      sent: 0,
      failed: 3,
      skipped: 1,
    });
    expect(log).toEqual([
      "failed:a:1:2026-11-03T10:05:00.000Z:rate limited by provider",
      "failed:b:3:2026-11-03T11:20:00.000Z:timeout",
      "failed:c:1:2026-11-03T10:05:00.000Z:address: auth down",
      "skipped:d:recipient_suppressed",
    ]);
    expect(MAX_ATTEMPTS).toBe(4);
    expect(nextAttemptAt(now, 2).toISOString()).toBe("2026-11-03T10:20:00.000Z");
  });

  it("unknown kinds are skipped, not retried", async () => {
    const { store, log } = fakeStore([row("x", { kind: "newsletter" })], {
      m1: "petr@example.org",
    });
    await processEmailQueue(store, async () => ({ sent: true }), { now });
    expect(log).toEqual(["skipped:x:unknown_kind:newsletter"]);
  });
});

describe("stored notifications in the list", () => {
  const pending: Booking = {
    id: "b1",
    property_id: "p1",
    requester_name: "Petr",
    requester_member_id: "m2",
    start_date: "2026-11-20",
    end_date: "2026-11-22",
    guests: 2,
    note: null,
    status: "PENDING",
    created_at: "2026-11-02T10:00:00Z",
    auto_approved: false,
  } as unknown as Booking;
  const input: NotificationInput = {
    today: "2026-11-03",
    myMemberId: "m1",
    isAdmin: true,
    isFamily: true,
    hasName: true,
    members: [{ id: "m1", name: "Anna" }],
    bookings: [pending],
  };
  const stored = (id: string, kind: string, payload: Record<string, unknown>) => ({
    id,
    kind,
    payload,
    created_at: "2026-11-02T10:00:01Z",
    read_at: null,
  });

  it("a stored stay-to-approve replaces the computed one while the stay is pending", () => {
    const items = buildNotifications({
      ...input,
      stored: [stored("s1", "booking_awaiting_approval", payloads.booking_awaiting_approval)],
    });
    expect(items.map((i) => i.key)).toEqual(["stored:s1"]);
    const decided = buildNotifications({
      ...input,
      bookings: [{ ...pending, status: "CONFIRMED" }],
      stored: [stored("s1", "booking_awaiting_approval", payloads.booking_awaiting_approval)],
    });
    expect(decided.map((i) => i.key)).toEqual([]);
  });

  it("other kinds are listed newest first with Czech and English titles", () => {
    const items = buildNotifications({
      ...input,
      bookings: [],
      stored: [
        stored("s2", "task_mentioned", payloads.task_mentioned),
        {
          ...stored("s3", "debt_reminder", payloads.debt_reminder),
          created_at: "2026-11-03T08:00:00Z",
        },
        stored("s4", "newsletter", {}),
      ],
    });
    expect(items.map((i) => i.key)).toEqual(["stored:s3", "stored:s2"]);
    expect(items[0]!.title[0]).toMatch(/1\s500 Kč/);
    expect(items[1]).toMatchObject({ to: "/ukoly/$id", params: { id: "t1" } });
    expect(items[1]!.title[1]).toContain("Fix the gutter");
  });
});

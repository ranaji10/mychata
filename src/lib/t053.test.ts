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
  payment_claimed: {
    claim_id: "c1",
    from_name: "Petr",
    amount: 300,
    property_name: "Chata Alfa",
    expense_title: "Dřevo",
  },
  payment_confirmed: {
    claim_id: "c1",
    from_name: "Anna",
    amount: 300,
    property_name: "Chata Alfa",
  },
  payment_rejected: { claim_id: "c1", from_name: "Anna", amount: 300, property_name: "Chata Alfa" },
};

describe("e-mail text", () => {
  for (const [kind, payload] of Object.entries(payloads)) {
    it(`${kind}: Czech and English, no names in the subject, a mychata.cz link`, () => {
      const e = renderNotificationEmail({ id: "n1", kind, payload })!;
      expect(e).not.toBeNull();
      expect(e.heading[0]).toBeTruthy();
      expect(e.heading[1]).toBeTruthy();
      expect(e.subject[0]).toBeTruthy();
      expect(e.subject[1]).toBeTruthy();
      for (const name of ["Anna", "Petr"]) expect(e.subject.join(" ")).not.toContain(name);
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

  it("the template renders one language, with paragraphs in order (T-057)", async () => {
    const html = await render(
      React.createElement(template.component, {
        lang: "en",
        heading: "Hello",
        paragraph: "First\n\nSecond",
        buttonLabel: "Open",
        buttonUrl: "https://mychata.cz/x",
      }),
    );
    expect(html).toMatch(/<html[^>]*lang="en"/);
    expect(html.indexOf("First")).toBeLessThan(html.indexOf("Second"));
    expect(html).toContain(">Open<");
    expect(html).not.toMatch(/Otevřít|Ahoj/);
  });
});

function fakeStore(
  rows: QueuedNotification[],
  emails: Record<string, string | null> = {},
  opts: { withdrawn?: string[]; langs?: Record<string, "cs" | "en"> } = {},
) {
  const log: string[] = [];
  const store: QueueStore = {
    async stillStands(n) {
      return !(opts.withdrawn ?? []).includes(n.id);
    },
    async languageOf(n) {
      return opts.langs?.[n.id] ?? null;
    },
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
    const calls: { to: string; key: string; subject: string[]; lang?: string }[] = [];
    const send: Sender = async (i) => {
      calls.push({
        to: i.to,
        key: i.idempotencyKey,
        subject: i.data.subject,
        ...(i.lang ? { lang: i.lang } : {}),
      });
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
        subject: ["Připomínka vyrovnání", "A reminder to settle up"],
        lang: "cs",
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

  it("T-055: what was withdrawn or decided before the run is not mailed", async () => {
    const { store, log } = fakeStore(
      [row("gone"), row("still")],
      { m1: "petr@example.org" },
      {
        withdrawn: ["gone"],
      },
    );
    const to: string[] = [];
    const r = await processEmailQueue(store, async (i) => (to.push(i.to), { sent: true }), { now });
    expect(r).toEqual({ sent: 1, failed: 0, skipped: 1 });
    expect(log).toEqual(["skipped:gone:withdrawn", "sent:still"]);
  });

  it("T-057: each e-mail goes out in the recipient's language, Czech when unknown", async () => {
    const { store } = fakeStore(
      [row("en"), row("unknown")],
      { m1: "petr@example.org" },
      {
        langs: { en: "en" },
      },
    );
    const langs: (string | undefined)[] = [];
    await processEmailQueue(store, async (i) => (langs.push(i.lang), { sent: true }), { now });
    expect(langs).toEqual(["en", "cs"]);
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
      // Something is still owed, so the reminder shows (T-057).
      expenses: [{ id: "e1", paid_by_member_id: "m3" }],
      splits: [
        { id: "sp1", expense_id: "e1", member_id: "m1", amount_owed: 1500, paid_back: false },
      ] as never,
      stored: [
        stored("s2", "task_mentioned", payloads.task_mentioned),
        {
          ...stored("s3", "debt_reminder", payloads.debt_reminder),
          created_at: "2026-11-03T08:00:00Z",
        },
        stored("s4", "newsletter", {}),
      ],
    });
    expect(items.map((i) => i.key).filter((k) => k.startsWith("stored:"))).toEqual([
      "stored:s3",
      "stored:s2",
    ]);
    expect(items[0]!.title[0]).toMatch(/1\s500 Kč/);
    const mention = items.find((i) => i.key === "stored:s2")!;
    expect(mention).toMatchObject({ to: "/ukoly/$id", params: { id: "t1" } });
    expect(mention.title[1]).toContain("Fix the gutter");
  });
});

describe("T-057 reminders and payment claims in the list", () => {
  const base: NotificationInput = {
    today: "2026-11-03",
    myMemberId: "m1",
    isAdmin: false,
    isFamily: true,
    hasName: true,
    members: [
      { id: "m1", name: "Anna" },
      { id: "m2", name: "Petr" },
    ],
  };
  const reminder = {
    id: "r1",
    kind: "debt_reminder",
    payload: { from_name: "Petr", from_member_id: "m2", amount: 300, property_name: "Chata" },
    created_at: "2026-11-03T08:00:00Z",
    read_at: null,
  };
  it("a reminder disappears once nothing is owed to its sender", () => {
    const owing = buildNotifications({
      ...base,
      expenses: [{ id: "e1", paid_by_member_id: "m2" }],
      splits: [
        { id: "s1", expense_id: "e1", member_id: "m1", amount_owed: 300, paid_back: false },
      ] as never,
      stored: [reminder],
    });
    expect(owing.map((i) => i.key)).toContain("stored:r1");
    const settled = buildNotifications({
      ...base,
      expenses: [{ id: "e1", paid_by_member_id: "m2" }],
      splits: [
        { id: "s1", expense_id: "e1", member_id: "m1", amount_owed: 300, paid_back: true },
      ] as never,
      stored: [reminder],
    });
    expect(settled.map((i) => i.key)).not.toContain("stored:r1");
  });
  it("an open claim to me asks me to confirm; the stored one replaces it while open", () => {
    const claims = [
      {
        id: "c1",
        from_member_id: "m2",
        to_member_id: "m1",
        amount: 300,
        created_at: "2026-11-03T09:00:00Z",
      },
    ];
    const open = buildNotifications({ ...base, claims });
    expect(open.map((i) => i.key)).toEqual(["claim:c1"]);
    expect(open[0]!.title[1]).toBe("Petr says they paid you 300 Kč");
    const withStored = buildNotifications({
      ...base,
      claims,
      stored: [
        {
          id: "n1",
          kind: "payment_claimed",
          payload: { claim_id: "c1", from_name: "Petr", amount: 300, property_name: "Chata" },
          created_at: "2026-11-03T09:00:01Z",
          read_at: null,
        },
      ],
    });
    expect(withStored.map((i) => i.key)).toEqual(["stored:n1"]);
    const decided = buildNotifications({
      ...base,
      claims: [],
      stored: [
        {
          id: "n1",
          kind: "payment_claimed",
          payload: { claim_id: "c1" },
          created_at: "2026-11-03T09:00:01Z",
          read_at: null,
        },
      ],
    });
    expect(decided).toEqual([]);
  });
});

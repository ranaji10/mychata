/**
 * T-053 (migration 0038): stored notifications, the e-mail queue's columns, task notes and
 * mentions. Who reads what, what each trigger creates, and what the functions refuse.
 * Personas: anon, the owner of A, a member of A, a member who left A, the admin of B, and a
 * signed-in visitor who belongs to no account.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { admin, as, asCommitted, freshDb, type Db } from "./harness";

const U = {
  aOwner: "53000000-0000-4000-8000-00000000000a",
  aMember: "53000000-0000-4000-8000-00000000000b",
  aSecond: "53000000-0000-4000-8000-00000000000c",
  leaver: "53000000-0000-4000-8000-00000000000d",
  bAdmin: "53000000-0000-4000-8000-00000000000e",
  visitor: "53000000-0000-4000-8000-00000000000f",
};
const who = (k: keyof typeof U) => ({
  role: "authenticated" as const,
  userId: U[k],
  email: `${k}@example.org`,
});
const anon = { role: "anon" as const };

let db: Db;
const ids: Record<string, string> = {};

async function val<T>(sql: string, params?: unknown[]): Promise<T> {
  const rows = (await admin(db, sql, params)) as Record<string, unknown>[];
  return Object.values(rows[0] ?? {})[0] as T;
}

async function notes(kind: string) {
  return (await admin(
    db,
    `select n.*, m.name as member_name from public.notifications n
       left join public.members m on m.id = n.recipient_member_id
      where kind = $1 order by created_at`,
    [kind],
  )) as Record<string, unknown>[];
}

beforeAll(async () => {
  db = await freshDb();
  for (const [k, id] of Object.entries(U)) {
    await admin(db, "insert into auth.users (id, email) values ($1, $2)", [id, `${k}@example.org`]);
  }
  await asCommitted(
    db,
    who("aOwner"),
    "select public.create_account_onboarding('FAMILY','Rodina A','Chata A','Addr A',null,4,'{}',null,null)",
  );
  ids.acctA = await val("select account_id from public.members where user_id = $1", [U.aOwner]);
  ids.propA = await val("select id from public.properties where account_id = $1", [ids.acctA]);
  ids.ownerA = await val("select id from public.members where user_id = $1", [U.aOwner]);
  await admin(db, "update public.accounts set booking_auto_approve = false where id = $1", [
    ids.acctA,
  ]);
  await admin(db, "update public.properties set auto_confirm = false where account_id = $1", [
    ids.acctA,
  ]);
  await admin(db, "update public.members set name = 'Anna' where id = $1", [ids.ownerA]);
  for (const [k, name] of [
    ["aMember", "Petr"],
    ["aSecond", "Jana"],
    ["leaver", "Karel"],
  ] as const) {
    ids[k] = await val(
      "insert into public.members (account_id, name, email, role, user_id) values ($1,$2,$3,'MEMBER',$4) returning id",
      [ids.acctA, name, `${k}@example.org`, U[k]],
    );
    await admin(
      db,
      "insert into public.profiles (user_id, member_id, active_account_id) values ($1,$2,$3) on conflict (user_id) do update set member_id = excluded.member_id, active_account_id = excluded.active_account_id",
      [U[k], ids[k], ids.acctA],
    );
  }
  await asCommitted(db, who("leaver"), "select public.leave_account($1)", [ids.acctA]);
  ids.acctB = await val(
    "insert into public.accounts (type, name) values ('INSTITUTIONAL','Klub B') returning id",
  );
  ids.propB = await val(
    "insert into public.properties (account_id, name, address) values ($1,'Chata B','Addr B') returning id",
    [ids.acctB],
  );
  ids.bAdmin = await val(
    "insert into public.members (account_id, name, email, role, user_id) values ($1,'Bara','bAdmin@example.org','ADMIN',$2) returning id",
    [ids.acctB, U.bAdmin],
  );
  ids.task = await val(
    "insert into public.tasks (property_id, title, created_by) values ($1,'Opravit okap','Anna') returning id",
    [ids.propA],
  );
}, 120_000);

describe("stays", () => {
  it("a stay waiting for approval notifies the owner, not the member who asked", async () => {
    const [b] = await asCommitted<{ id: string; status: string }>(
      db,
      who("aMember"),
      "insert into public.bookings (property_id, requester_name, start_date, end_date) values ($1,'Petr', current_date + 20, current_date + 22) returning id, status",
      [ids.propA],
    );
    expect(b!.status).toBe("PENDING");
    ids.pending = b!.id;
    const rows = await notes("booking_awaiting_approval");
    expect(rows.map((r) => r.member_name)).toEqual(["Anna"]);
    expect(rows[0]!.payload).toMatchObject({ booking_id: b!.id, requester_name: "Petr" });
    expect(rows[0]!.email_wanted).toBe(true);
    expect(rows[0]!.sender_user_id).toBe(U.aMember);
  });

  it("only the recipient reads it; nobody writes notifications directly", async () => {
    const sel = "select id, kind from public.notifications";
    expect(await as(db, who("aOwner"), (q) => q(sel))).toHaveLength(1);
    expect(await as(db, who("aMember"), (q) => q(sel))).toHaveLength(0);
    expect(await as(db, who("aSecond"), (q) => q(sel))).toHaveLength(0);
    expect(await as(db, who("leaver"), (q) => q(sel))).toHaveLength(0);
    expect(await as(db, who("bAdmin"), (q) => q(sel))).toHaveLength(0);
    await expect(as(db, anon, (q) => q(sel))).rejects.toThrow(/permission denied/);
    await expect(
      as(db, who("aOwner"), (q) => q("select email_error from public.notifications")),
    ).rejects.toThrow(/permission denied/);
    await expect(
      as(db, who("aOwner"), (q) =>
        q(
          "insert into public.notifications (account_id, recipient_member_id, kind) values ($1,$2,'debt_reminder')",
          [ids.acctA, ids.aMember],
        ),
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(
      as(db, who("aOwner"), (q) => q("update public.notifications set read_at = now()")),
    ).rejects.toThrow(/permission denied/);
  });

  it("confirming tells the member; they mark it read, others can't", async () => {
    await asCommitted(
      db,
      who("aOwner"),
      "update public.bookings set status = 'CONFIRMED' where id = $1",
      [ids.pending],
    );
    const [n] = await notes("booking_decided");
    expect(n).toMatchObject({ member_name: "Petr" });
    expect(n!.payload).toMatchObject({ approved: true, decided_by: "Anna" });
    const mine = await as(db, who("aMember"), (q) =>
      q<{ id: string }>("select id from public.notifications where kind = 'booking_decided'"),
    );
    expect(mine).toHaveLength(1);
    const other = await as(db, who("bAdmin"), (q) =>
      q<{ n: number }>("select public.mark_notifications_read($1) as n", [[mine[0]!.id]]),
    );
    expect(other[0]!.n).toBe(0);
    const [r] = await asCommitted<{ n: number }>(
      db,
      who("aMember"),
      "select public.mark_notifications_read($1) as n",
      [[mine[0]!.id]],
    );
    expect(r!.n).toBe(1);
    await expect(
      as(db, anon, (q) => q("select public.mark_notifications_read('{}')")),
    ).rejects.toThrow(/permission denied/);
  });

  it("declining (deleting) a waiting stay tells the member; withdrawing your own doesn't", async () => {
    const [b] = await asCommitted<{ id: string }>(
      db,
      who("aMember"),
      "insert into public.bookings (property_id, requester_name, start_date, end_date) values ($1,'Petr', current_date + 40, current_date + 41) returning id",
      [ids.propA],
    );
    await asCommitted(db, who("aOwner"), "delete from public.bookings where id = $1", [b!.id]);
    const declined = (await notes("booking_decided")).filter(
      (r) => (r.payload as { booking_id: string }).booking_id === b!.id,
    );
    expect(declined).toHaveLength(1);
    expect(declined[0]!.payload).toMatchObject({ approved: false });

    const [c] = await asCommitted<{ id: string }>(
      db,
      who("aMember"),
      "insert into public.bookings (property_id, requester_name, start_date, end_date) values ($1,'Petr', current_date + 50, current_date + 51) returning id",
      [ids.propA],
    );
    await asCommitted(db, who("aMember"), "delete from public.bookings where id = $1", [c!.id]);
    const own = (await notes("booking_decided")).filter(
      (r) => (r.payload as { booking_id: string }).booking_id === c!.id,
    );
    expect(own).toHaveLength(0);
  });
});

describe("offers, invitations, guest requests", () => {
  it("an ownership offer notifies the member offered", async () => {
    await asCommitted(db, who("aOwner"), "select public.offer_account_ownership($1,$2)", [
      ids.acctA,
      ids.aSecond,
    ]);
    const rows = await notes("ownership_offered");
    expect(rows.map((r) => r.member_name)).toEqual(["Jana"]);
    expect(rows[0]!.payload).toMatchObject({ account_name: "Rodina A", from_name: "Anna" });
    await asCommitted(db, who("aOwner"), "select public.cancel_account_ownership($1)", [
      (rows[0]!.payload as { offer_id: string }).offer_id,
    ]);
  });

  it("an invitation with an e-mail is queued to that address and readable by no one", async () => {
    await asCommitted(
      db,
      who("aOwner"),
      "insert into public.invitations (account_id, property_id, email, role, created_by_member_id) values ($1,$2,' Nova@Example.org ','MEMBER',$3)",
      [ids.acctA, ids.propA, ids.ownerA],
    );
    await asCommitted(
      db,
      who("aOwner"),
      "insert into public.invitations (account_id, property_id, role, created_by_member_id) values ($1,$2,'MEMBER',$3)",
      [ids.acctA, ids.propA, ids.ownerA],
    );
    const rows = await notes("invitation");
    expect(rows).toHaveLength(1);
    expect(rows[0]!.recipient_email).toBe("nova@example.org");
    expect(rows[0]!.payload).toMatchObject({ invited_by: "Anna", property_name: "Chata A" });
    for (const p of ["aOwner", "aMember", "bAdmin", "visitor"] as const) {
      const seen = await as(db, who(p), (q) =>
        q("select id from public.notifications where kind = 'invitation'"),
      );
      expect(seen).toHaveLength(0);
    }
  });

  it("a decided public-calendar request goes to the visitor's sign-in, a guest's to their e-mail", async () => {
    const pub = await val<string>(
      "insert into public.guest_requests (property_id, guest_name, guest_email, start_date, end_date, guests, status, source, requester_user_id) values ($1,'Visitor','visitor@example.org', current_date + 60, current_date + 62, 2, 'PENDING','public_calendar',$2) returning id",
      [ids.propA, U.visitor],
    );
    const guest = await val<string>(
      "insert into public.guest_requests (property_id, guest_name, guest_email, start_date, end_date, guests, status) values ($1,'Host','host@example.org', current_date + 70, current_date + 71, 1, 'PENDING') returning id",
      [ids.propA],
    );
    await asCommitted(db, who("aOwner"), "select public.decide_guest_request($1, true)", [pub]);
    await asCommitted(db, who("aOwner"), "select public.decide_guest_request($1, false)", [guest]);
    const rows = await notes("guest_request_decided");
    expect(rows).toHaveLength(2);
    const toVisitor = rows.find((r) => r.recipient_user_id === U.visitor)!;
    expect(toVisitor.payload).toMatchObject({ approved: true, source: "public_calendar" });
    expect((toVisitor.payload as { calendar_token: string }).calendar_token).toBeTruthy();
    const toGuest = rows.find((r) => r.recipient_email === "host@example.org")!;
    expect(toGuest.payload).toMatchObject({ approved: false, calendar_token: null });
    const visitorSees = await as(db, who("visitor"), (q) =>
      q("select id from public.notifications"),
    );
    expect(visitorSees).toHaveLength(1);
  });
});

describe("leaving checklist", () => {
  it("goes to the member with the next confirmed stay, done and skipped items listed", async () => {
    await admin(
      db,
      "insert into public.bookings (property_id, requester_name, requester_member_id, start_date, end_date, status) values ($1,'Jana',$2, current_date + 5, current_date + 7, 'CONFIRMED')",
      [ids.propA, ids.aSecond],
    );
    const [h] = await asCommitted<{ id: string }>(
      db,
      who("aOwner"),
      `insert into public.handovers (property_id, member_id, checklist_state, note) values ($1,$2,
        '{"Zamknout":{"state":"checked"},"Voda":{"state":"skipped","reason":"zamrzlá"}}', 'Klíč u souseda') returning id`,
      [ids.propA, ids.ownerA],
    );
    const rows = await notes("leaving_checklist");
    expect(rows.map((r) => r.member_name)).toEqual(["Jana"]);
    expect(rows[0]!.payload).toMatchObject({
      from_name: "Anna",
      done: ["Zamknout"],
      skipped: [{ item: "Voda", reason: "zamrzlá" }],
      note: "Klíč u souseda",
    });
    const next = await as(db, who("aMember"), (q) =>
      q("select * from public.handover_next_recipient($1)", [h!.id]),
    );
    expect(next[0]).toMatchObject({ member_name: "Jana", sent: true });
    await expect(
      as(db, who("bAdmin"), (q) => q("select * from public.handover_next_recipient($1)", [h!.id])),
    ).rejects.toThrow(/not_a_member/);
  });

  it("with nobody booked, it waits for the next stay to be confirmed", async () => {
    const propC = await val<string>(
      "insert into public.properties (account_id, name, address, auto_confirm) values ($1,'Chata C','Addr C', false) returning id",
      [ids.acctA],
    );
    await asCommitted(
      db,
      who("aOwner"),
      `insert into public.handovers (property_id, member_id, checklist_state) values ($1,$2,'{"Zamknout":{"state":"checked"}}')`,
      [propC, ids.ownerA],
    );
    const before = (await notes("leaving_checklist")).length;
    const [b] = await asCommitted<{ id: string }>(
      db,
      who("aMember"),
      "insert into public.bookings (property_id, requester_name, start_date, end_date) values ($1,'Petr', current_date + 3, current_date + 4) returning id",
      [propC],
    );
    expect((await notes("leaving_checklist")).length).toBe(before);
    await asCommitted(
      db,
      who("aOwner"),
      "update public.bookings set status = 'CONFIRMED' where id = $1",
      [b!.id],
    );
    const after = await notes("leaving_checklist");
    expect(after.length).toBe(before + 1);
    expect(after.at(-1)!.member_name).toBe("Petr");
  });

  it("booking your own confirmed stay still brings you the checklist", async () => {
    const propD = await val<string>(
      "insert into public.properties (account_id, name, address, auto_confirm) values ($1,'Chata D','Addr D', true) returning id",
      [ids.acctA],
    );
    await asCommitted(
      db,
      who("aOwner"),
      `insert into public.handovers (property_id, member_id, checklist_state) values ($1,$2,'{}')`,
      [propD, ids.ownerA],
    );
    const before = (await notes("leaving_checklist")).length;
    const [b] = await asCommitted<{ status: string }>(
      db,
      who("aSecond"),
      "insert into public.bookings (property_id, requester_name, start_date, end_date) values ($1,'Jana', current_date + 30, current_date + 31) returning status",
      [propD],
    );
    expect(b!.status).toBe("CONFIRMED");
    const after = await notes("leaving_checklist");
    expect(after.length).toBe(before + 1);
    expect(after.at(-1)!.member_name).toBe("Jana");
  });
});

describe("task notes", () => {
  it("a note mentions members of the same account and notifies them", async () => {
    const [r] = await asCommitted<{ id: string }>(
      db,
      who("aOwner"),
      "select public.add_task_note($1, '  Prosím zkontroluj okap  ', $2) as id",
      [ids.task, [ids.aMember, ids.ownerA]],
    );
    ids.note = r!.id;
    const rows = await notes("task_mentioned");
    expect(rows.map((x) => x.member_name)).toEqual(["Petr"]);
    expect(rows[0]!.payload).toMatchObject({
      author_name: "Anna",
      excerpt: "Prosím zkontroluj okap",
    });
    const mentions = await as(db, who("aMember"), (q) =>
      q("select member_id from public.task_note_mentions where note_id = $1", [ids.note]),
    );
    expect(mentions).toHaveLength(2);
  });

  it("refuses a mention from another account, of a member who left, and outsiders", async () => {
    const add = (m: string) => (q: (s: string, p?: unknown[]) => Promise<unknown[]>) =>
      q("select public.add_task_note($1, 'x', $2)", [ids.task, [m]]);
    await expect(as(db, who("aOwner"), add(ids.bAdmin!))).rejects.toThrow(/mention_not_in_account/);
    await expect(as(db, who("aOwner"), add(ids.leaver!))).rejects.toThrow(/mention_not_in_account/);
    await expect(as(db, who("bAdmin"), add(ids.bAdmin!))).rejects.toThrow(/not_a_member/);
    await expect(as(db, who("leaver"), add(ids.ownerA!))).rejects.toThrow(/not_a_member/);
    await expect(
      as(db, who("aOwner"), (q) => q("select public.add_task_note($1, '   ')", [ids.task])),
    ).rejects.toThrow(/invalid_body/);
    await expect(
      as(db, anon, (q) => q("select public.add_task_note($1, 'x')", [ids.task])),
    ).rejects.toThrow(/permission denied/);
  });

  it("members read notes; only the author edits or deletes; nobody inserts directly", async () => {
    const sel = "select id from public.task_notes";
    expect(await as(db, who("aMember"), (q) => q(sel))).toHaveLength(1);
    expect(await as(db, who("aSecond"), (q) => q(sel))).toHaveLength(1);
    expect(await as(db, who("bAdmin"), (q) => q(sel))).toHaveLength(0);
    expect(await as(db, who("leaver"), (q) => q(sel))).toHaveLength(0);
    expect(
      await as(db, who("bAdmin"), (q) => q("select * from public.task_note_mentions")),
    ).toHaveLength(0);
    await expect(as(db, anon, (q) => q(sel))).rejects.toThrow(/permission denied/);
    const upd = "update public.task_notes set body = 'změna' where id = $1 returning id";
    expect(await as(db, who("aMember"), (q) => q(upd, [ids.note]))).toHaveLength(0);
    expect(await as(db, who("aOwner"), (q) => q(upd, [ids.note]))).toHaveLength(1);
    await expect(
      as(db, who("aOwner"), (q) =>
        q("update public.task_notes set task_id = task_id where id = $1", [ids.note]),
      ),
    ).rejects.toThrow(/permission denied/);
    const del = "delete from public.task_notes where id = $1 returning id";
    expect(await as(db, who("aMember"), (q) => q(del, [ids.note]))).toHaveLength(0);
    expect(await as(db, who("aOwner"), (q) => q(del, [ids.note]))).toHaveLength(1);
    await expect(
      as(db, who("aMember"), (q) =>
        q(
          "insert into public.task_notes (account_id, task_id, author_member_id, body) values ($1,$2,$3,'x')",
          [ids.acctA, ids.task, ids.aMember],
        ),
      ),
    ).rejects.toThrow(/permission denied/);
  });
});

describe("messages and reminders", () => {
  it("a message reaches the admins only, ten a day", async () => {
    const [r] = await asCommitted<{ n: number }>(
      db,
      who("aMember"),
      "select public.message_admins($1, 'Prosím o klíč') as n",
      [ids.acctA],
    );
    expect(r!.n).toBe(1);
    const rows = await notes("message_to_admin");
    expect(rows.map((x) => x.member_name)).toEqual(["Anna"]);
    expect(rows[0]!.payload).toMatchObject({ from_name: "Petr", body: "Prosím o klíč" });
    await expect(
      as(db, who("bAdmin"), (q) => q("select public.message_admins($1, 'x')", [ids.acctA])),
    ).rejects.toThrow(/not_a_member/);
    await admin(
      db,
      "update public.usage_counters set count = 10 where user_id = $1 and kind = 'message_admins'",
      [U.aMember],
    );
    await expect(
      as(db, who("aMember"), (q) => q("select public.message_admins($1, 'x')", [ids.acctA])),
    ).rejects.toThrow(/rate_limited/);
  });

  it("a reminder states what is owed, once a day per pair", async () => {
    const exp = await val<string>(
      "insert into public.expenses (property_id, amount, paid_by_member_id) values ($1, 900, $2) returning id",
      [ids.propA, ids.ownerA],
    );
    await admin(
      db,
      "insert into public.expense_splits (expense_id, member_id, amount_owed) values ($1,$2,300)",
      [exp, ids.aMember],
    );
    const [r] = await asCommitted<{ owed: string }>(
      db,
      who("aOwner"),
      "select public.remind_debt($1,$2) as owed",
      [ids.propA, ids.aMember],
    );
    expect(Number(r!.owed)).toBe(300);
    await asCommitted(db, who("aOwner"), "select public.remind_debt($1,$2)", [
      ids.propA,
      ids.aMember,
    ]);
    const rows = await notes("debt_reminder");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ member_name: "Petr" });
    await expect(
      as(db, who("aMember"), (q) => q("select public.remind_debt($1,$2)", [ids.propA, ids.ownerA])),
    ).rejects.toThrow(/nothing_owed/);
    await expect(
      as(db, who("aOwner"), (q) => q("select public.remind_debt($1,$2)", [ids.propA, ids.bAdmin])),
    ).rejects.toThrow(/member_not_in_account/);
  });

  it("past 60 e-mails a day, notifications are stored but not e-mailed", async () => {
    await admin(
      db,
      "insert into public.usage_counters (user_id, kind, day, count) values ($1,'notification_email',current_date,60) on conflict (user_id, kind, day) do update set count = 60",
      [U.aSecond],
    );
    await asCommitted(db, who("aSecond"), "select public.message_admins($1, 'Ahoj')", [ids.acctA]);
    const last = (await notes("message_to_admin")).at(-1)!;
    expect(last).toMatchObject({ email_wanted: false, email_error: "rate_limited" });
  });
});

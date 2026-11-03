/**
 * T-053 (migration 0038) RLS audit: notifications, task_notes, task_note_mentions and the 0038
 * functions, for anon, a member of A, an admin of A, a member of B and a member who left A.
 * Complements t053.test.ts (behaviour) with the who-can-do-what matrix and attack probes.
 *
 * The three gaps the audit found (G1–G3) are closed in 0038; their tests now prove the fix.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { admin, as, asCommitted, freshDb, type Db } from "./harness";

const U = {
  aOwner: "53100000-0000-4000-8000-00000000000a",
  aAdmin: "53100000-0000-4000-8000-00000000000b",
  aMember: "53100000-0000-4000-8000-00000000000c",
  aSecond: "53100000-0000-4000-8000-00000000000d",
  leaver: "53100000-0000-4000-8000-00000000000e",
  bMember: "53100000-0000-4000-8000-00000000000f",
  bAdmin: "53100000-0000-4000-8000-000000000010",
};
type Who = keyof typeof U;
const who = (k: Who) => ({
  role: "authenticated" as const,
  userId: U[k],
  email: `${k}@example.org`,
});
const anon = { role: "anon" as const };
const AUTH: Who[] = ["aOwner", "aAdmin", "aMember", "aSecond", "leaver", "bMember", "bAdmin"];

let db: Db;
const ids: Record<string, string> = {};

async function val<T>(sql: string, params?: unknown[]): Promise<T> {
  const rows = (await admin(db, sql, params)) as Record<string, unknown>[];
  return Object.values(rows[0] ?? {})[0] as T;
}
const count = (sql: string, params?: unknown[]) =>
  val<string>(`select count(*)::text from (${sql}) x`, params).then(Number);
const notifCount = () => count("select 1 from public.notifications");

beforeAll(async () => {
  db = await freshDb();
  for (const [k, id] of Object.entries(U)) {
    await admin(
      db,
      "insert into auth.users (id, email, email_confirmed_at) values ($1, $2, now())",
      [id, `${k}@example.org`],
    );
  }
  await asCommitted(
    db,
    who("aOwner"),
    "select public.create_account_onboarding('FAMILY','Rodina A','Chata A','Addr A',null,4,'{}',null,null)",
  );
  ids.acctA = await val("select account_id from public.members where user_id = $1", [U.aOwner]);
  ids.propA = await val("select id from public.properties where account_id = $1", [ids.acctA]);
  ids.ownerA = await val("select id from public.members where user_id = $1", [U.aOwner]);
  await admin(db, "update public.members set name = 'Anna' where id = $1", [ids.ownerA]);
  await admin(db, "update public.accounts set booking_auto_approve = false where id = $1", [
    ids.acctA,
  ]);
  await admin(db, "update public.properties set auto_confirm = false where account_id = $1", [
    ids.acctA,
  ]);
  for (const [k, name, role] of [
    ["aAdmin", "Adam", "ADMIN"],
    ["aMember", "Petr", "MEMBER"],
    ["aSecond", "Jana", "MEMBER"],
    ["leaver", "Karel", "MEMBER"],
  ] as const) {
    ids[k] = await val(
      "insert into public.members (account_id, name, email, role, user_id) values ($1,$2,$3,$4,$5) returning id",
      [ids.acctA, name, `${k}@example.org`, role, U[k]],
    );
  }
  ids.acctB = await val(
    "insert into public.accounts (type, name) values ('FAMILY','Rodina B') returning id",
  );
  ids.propB = await val(
    "insert into public.properties (account_id, name, address) values ($1,'Tajna Chata B','Addr B') returning id",
    [ids.acctB],
  );
  for (const [k, name, role] of [
    ["bAdmin", "Bara", "ADMIN"],
    ["bMember", "Boris", "MEMBER"],
  ] as const) {
    ids[k] = await val(
      "insert into public.members (account_id, name, email, role, user_id) values ($1,$2,$3,$4,$5) returning id",
      [ids.acctB, name, `${k}@example.org`, role, U[k]],
    );
  }
  ids.task = await val(
    "insert into public.tasks (property_id, title, created_by) values ($1,'Opravit okap','Anna') returning id",
    [ids.propA],
  );

  // The leaver books a stay (waiting) and gets mentioned while still a member, then leaves.
  const [lb] = await asCommitted<{ id: string }>(
    db,
    who("leaver"),
    "insert into public.bookings (property_id, requester_name, start_date, end_date) values ($1,'Karel', current_date + 90, current_date + 91) returning id",
    [ids.propA],
  );
  ids.leaverBooking = lb!.id;
  await asCommitted(db, who("aOwner"), "select public.add_task_note($1, 'Karle, okap', $2)", [
    ids.task,
    [ids.leaver],
  ]);
  ids.leaverNotif = await val(
    "select id from public.notifications where recipient_member_id = $1 and kind = 'task_mentioned'",
    [ids.leaver],
  );
  expect(ids.leaverNotif).toBeTruthy();
  await asCommitted(db, who("leaver"), "select public.leave_account($1)", [ids.acctA]);

  // One notification each for aOwner and aMember, a note by aMember.
  await asCommitted(db, who("aMember"), "select public.message_admins($1, 'Ahoj')", [ids.acctA]);
  ids.ownerNotif = await val(
    "select id from public.notifications where recipient_member_id = $1 and kind = 'message_to_admin'",
    [ids.ownerA],
  );
  ids.adminNotif = await val(
    "select id from public.notifications where recipient_member_id = $1 and kind = 'message_to_admin'",
    [ids.aAdmin],
  );
  const [n] = await asCommitted<{ id: string }>(
    db,
    who("aMember"),
    "select public.add_task_note($1, 'Petrova poznamka', $2) as id",
    [ids.task, [ids.aSecond]],
  );
  ids.memberNote = n!.id;
  ids.secondNotif = await val(
    "select id from public.notifications where recipient_member_id = $1 and kind = 'task_mentioned'",
    [ids.aSecond],
  );
}, 120_000);

describe("function execute grants", () => {
  const internal = [
    "notify_enqueue",
    "notify_leaving_checklist",
    "next_stay_after_handover",
    "forward_leaving_checklist_to",
    "notify_on_booking",
    "notify_on_handover",
    "notify_on_guest_request",
    "notify_on_ownership_offer",
    "notify_on_invitation",
  ];
  const callable = [
    "mark_notifications_read",
    "handover_next_recipient",
    "add_task_note",
    "message_admins",
    "remind_debt",
  ];
  const privs = (name: string) =>
    admin(
      db,
      `select p.prosecdef as definer, p.proconfig as cfg,
              has_function_privilege('anon', p.oid, 'execute') as anon,
              has_function_privilege('authenticated', p.oid, 'execute') as auth
         from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = $1`,
      [name],
    ) as Promise<{ definer: boolean; cfg: string[]; anon: boolean; auth: boolean }[]>;

  it("internal helpers and triggers: no execute for anon or authenticated", async () => {
    for (const f of internal) {
      const rows = await privs(f);
      expect(rows, f).toHaveLength(1);
      expect(rows[0], f).toMatchObject({ definer: true, anon: false, auth: false });
      expect(rows[0]!.cfg, f).toContain("search_path=public");
    }
  });

  it("caller-facing functions: authenticated only", async () => {
    for (const f of callable) {
      const rows = await privs(f);
      expect(rows, f).toHaveLength(1);
      expect(rows[0], f).toMatchObject({ definer: true, anon: false, auth: true });
      expect(rows[0]!.cfg, f).toContain("search_path=public");
    }
  });

  it("a signed-in user cannot call notify_enqueue or the internal helpers directly", async () => {
    const calls = [
      [
        "select public.notify_enqueue($1,'debt_reminder',$2,null,null,'{}'::jsonb,null)",
        [ids.acctA, ids.aMember],
      ],
      [
        "select public.notify_enqueue($1,'debt_reminder',null,$2,null,'{}'::jsonb,null)",
        [ids.acctB, U.bMember],
      ],
      ["select public.notify_leaving_checklist($1,$2)", [ids.task, ids.task]],
      ["select public.next_stay_after_handover($1)", [ids.task]],
      ["select public.forward_leaving_checklist_to($1)", [ids.leaverBooking]],
    ] as const;
    for (const [sql, p] of calls) {
      for (const persona of [who("aOwner"), who("bAdmin"), anon]) {
        await expect(as(db, persona, (q) => q(sql, [...p]))).rejects.toThrow(/permission denied/);
      }
    }
  });
});

describe("notifications", () => {
  const ownIds = async (k: Who) =>
    (
      await as(db, who(k), (q) =>
        q<{ id: string }>("select id from public.notifications order by id"),
      )
    ).map((r) => r.id);

  it("select: each person sees only rows addressed to them", async () => {
    const all = (await admin(
      db,
      `select n.id, coalesce(m.user_id, n.recipient_user_id) as uid from public.notifications n
         left join public.members m on m.id = n.recipient_member_id`,
    )) as { id: string; uid: string | null }[];
    for (const k of AUTH) {
      const expected = all
        .filter((r) => r.uid === U[k])
        .map((r) => r.id)
        .sort();
      expect(await ownIds(k), k).toEqual(expected);
    }
    expect(await ownIds("aOwner")).toContain(ids.ownerNotif);
    expect(await ownIds("aAdmin")).toContain(ids.adminNotif);
    // Admin of the same account does not see members' notifications.
    expect(await ownIds("aAdmin")).not.toContain(ids.secondNotif);
    expect(await ownIds("aOwner")).not.toContain(ids.secondNotif);
    await expect(as(db, anon, (q) => q("select id from public.notifications"))).rejects.toThrow(
      /permission denied/,
    );
  });

  it("a member who left loses their old notifications", async () => {
    expect(await ownIds("leaver")).toEqual([]);
    const [r] = await as(db, who("leaver"), (q) =>
      q<{ n: number }>("select public.mark_notifications_read($1) as n", [[ids.leaverNotif]]),
    );
    expect(r!.n).toBe(0);
  });

  it("a member who left gets nothing new (their waiting stay is confirmed after they left)", async () => {
    const before = await notifCount();
    await asCommitted(
      db,
      who("aOwner"),
      "update public.bookings set status = 'CONFIRMED' where id = $1",
      [ids.leaverBooking],
    );
    expect(await val("select status from public.bookings where id = $1", [ids.leaverBooking])).toBe(
      "CONFIRMED",
    );
    expect(await notifCount()).toBe(before);
    expect(
      await count(
        "select 1 from public.notifications where recipient_member_id = $1 and kind = 'booking_decided'",
        [ids.leaver],
      ),
    ).toBe(0);
  });

  it("insert, update, delete: denied to everyone but the service role", async () => {
    const ins =
      "insert into public.notifications (account_id, recipient_member_id, kind) values ($1,$2,'debt_reminder')";
    for (const persona of [anon, ...AUTH.map(who)]) {
      await expect(as(db, persona, (q) => q(ins, [ids.acctA, ids.aMember]))).rejects.toThrow(
        /permission denied/,
      );
      await expect(
        as(db, persona, (q) => q("update public.notifications set read_at = now()")),
      ).rejects.toThrow(/permission denied/);
      await expect(
        as(db, persona, (q) =>
          q("update public.notifications set read_at = now() where id = $1", [ids.ownerNotif]),
        ),
      ).rejects.toThrow(/permission denied/);
      await expect(
        as(db, persona, (q) =>
          q("delete from public.notifications where id = $1", [ids.ownerNotif]),
        ),
      ).rejects.toThrow(/permission denied/);
    }
    const rows = await as(db, { role: "service_role" }, (q) =>
      q("update public.notifications set emailed_at = now() where id = $1 returning id", [
        ids.ownerNotif,
      ]),
    );
    expect(rows).toHaveLength(1);
  });

  it("column grants: sender_user_id and the e-mail columns cannot be read, filtered or sorted on", async () => {
    const probes = [
      "select sender_user_id from public.notifications",
      "select recipient_email from public.notifications",
      "select email_error, email_attempts, emailed_at, email_next_at, email_wanted, dedupe_key from public.notifications",
      "select id from public.notifications where sender_user_id = '53100000-0000-4000-8000-00000000000c'",
      "select id from public.notifications where recipient_email like '%@%'",
      "select id from public.notifications order by email_attempts",
      "select count(*) filter (where emailed_at is null) from public.notifications",
      "select n.* from public.notifications n",
      "select to_jsonb(n) from public.notifications n",
      "select n::text from public.notifications n",
      "select row_to_json(n) from public.notifications n",
    ];
    for (const sql of probes) {
      await expect(
        as(db, who("aOwner"), (q) => q(sql)),
        sql,
      ).rejects.toThrow(/permission denied/);
    }
    // The granted columns work.
    const ok = await as(db, who("aOwner"), (q) =>
      q(
        "select id, account_id, recipient_member_id, recipient_user_id, kind, payload, created_at, read_at from public.notifications",
      ),
    );
    expect(ok.length).toBeGreaterThan(0);
  });

  it("mark read: only your own, whatever ids you pass", async () => {
    const everyone = (await admin(db, "select id from public.notifications")) as { id: string }[];
    const allIds = everyone.map((r) => r.id);
    const read = async (k: Who) =>
      (
        await as(db, who(k), (q) =>
          q<{ n: number }>("select public.mark_notifications_read($1) as n", [allIds]),
        )
      )[0]!.n;
    // Same-account member, same-account admin, other account, leaver: each only their own.
    const mine = async (k: Who) =>
      count(
        `select 1 from public.notifications n left join public.members m on m.id = n.recipient_member_id
          where read_at is null and coalesce(m.user_id, n.recipient_user_id) = $1`,
        [U[k]],
      );
    for (const k of ["aMember", "aAdmin", "aSecond", "bMember", "bAdmin", "leaver"] as Who[]) {
      expect(await read(k), k).toBe(await mine(k));
    }
    // Committed: aSecond marks everything; aOwner's stays unread.
    await asCommitted(db, who("aSecond"), "select public.mark_notifications_read($1)", [allIds]);
    expect(
      await val("select read_at from public.notifications where id = $1", [ids.ownerNotif]),
    ).toBeNull();
    expect(
      await val("select read_at from public.notifications where id = $1", [ids.secondNotif]),
    ).not.toBeNull();
    await expect(
      as(db, anon, (q) => q("select public.mark_notifications_read($1)", [allIds])),
    ).rejects.toThrow(/permission denied/);
  });
});

describe("triggers cannot be reached across accounts", () => {
  it("B cannot insert, update or delete A's stays, handovers, invitations or guest requests", async () => {
    const before = await notifCount();
    const pendingA = await val<string>(
      "insert into public.bookings (property_id, requester_name, requester_member_id, start_date, end_date, status) values ($1,'Petr',$2, current_date + 120, current_date + 121, 'PENDING') returning id",
      [ids.propA, ids.aMember],
    );
    const guestA = await val<string>(
      "insert into public.guest_requests (property_id, guest_name, guest_email, start_date, end_date, guests, status) values ($1,'Host','host@example.org', current_date + 130, current_date + 131, 1, 'PENDING') returning id",
      [ids.propA],
    );
    const afterFixtures = await notifCount();
    for (const k of ["bMember", "bAdmin", "leaver"] as Who[]) {
      await expect(
        as(db, who(k), (q) =>
          q(
            "insert into public.bookings (property_id, requester_name, start_date, end_date) values ($1,'x', current_date + 140, current_date + 141)",
            [ids.propA],
          ),
        ),
        k,
      ).rejects.toThrow(/row-level security/);
      await expect(
        as(db, who(k), (q) =>
          q(
            "insert into public.handovers (property_id, member_id, checklist_state) values ($1,$2,'{}')",
            [ids.propA, ids.ownerA],
          ),
        ),
        k,
      ).rejects.toThrow(/row-level security/);
      await expect(
        as(db, who(k), (q) =>
          q(
            "insert into public.invitations (account_id, property_id, email, role, created_by_member_id) values ($1,$2,'x@example.org','MEMBER',$3)",
            [ids.acctA, ids.propA, ids.ownerA],
          ),
        ),
        k,
      ).rejects.toThrow(/row-level security/);
      const upd = await as(db, who(k), (q) =>
        q("update public.bookings set status = 'CONFIRMED' where id = $1 returning id", [pendingA]),
      );
      expect(upd, k).toHaveLength(0);
      const del = await as(db, who(k), (q) =>
        q("delete from public.bookings where id = $1 returning id", [pendingA]),
      );
      expect(del, k).toHaveLength(0);
      const gr = await as(db, who(k), (q) =>
        q("update public.guest_requests set status = 'APPROVED' where id = $1 returning id", [
          guestA,
        ]),
      );
      expect(gr, k).toHaveLength(0);
      await expect(
        as(db, who(k), (q) => q("select public.decide_guest_request($1, true)", [guestA])),
        k,
      ).rejects.toThrow(/Admin role required/);
    }
    for (const [sql, p] of [
      [
        "insert into public.ownership_offers (account_id, from_member_id, to_member_id) values ($1,$2,$3)",
        [ids.acctA, ids.ownerA, ids.aMember],
      ],
      [
        "insert into public.bookings (property_id, requester_name, start_date, end_date) values ($1,'x', current_date + 150, current_date + 151)",
        [ids.propA],
      ],
    ] as const) {
      await expect(as(db, anon, (q) => q(sql, [...p]))).rejects.toThrow(/permission denied/);
    }
    expect(await notifCount()).toBe(afterFixtures);
    expect(afterFixtures).toBeGreaterThanOrEqual(before);
  });

  it("a plain member of A cannot decide stays or guest requests, or redirect a stay to someone else", async () => {
    const pending = await val<string>(
      "insert into public.bookings (property_id, requester_name, requester_member_id, start_date, end_date, status) values ($1,'Petr',$2, current_date + 160, current_date + 161, 'PENDING') returning id",
      [ids.propA, ids.aMember],
    );
    await expect(
      as(db, who("aMember"), (q) =>
        q("update public.bookings set status = 'CONFIRMED' where id = $1", [pending]),
      ),
    ).rejects.toThrow(/admin_approval_required/);
    await expect(
      as(db, who("aMember"), (q) =>
        q("update public.bookings set requester_member_id = $2 where id = $1", [
          pending,
          ids.bMember,
        ]),
      ),
    ).rejects.toThrow(/Admin role required/);
    const guest = await val<string>(
      "insert into public.guest_requests (property_id, guest_name, start_date, end_date, guests, status) values ($1,'Host', current_date + 170, current_date + 171, 1, 'PENDING') returning id",
      [ids.propA],
    );
    const r = await as(db, who("aMember"), (q) =>
      q("update public.guest_requests set status = 'APPROVED' where id = $1 returning id", [guest]),
    );
    expect(r).toHaveLength(0);
    await expect(
      as(db, who("aMember"), (q) =>
        q(
          "insert into public.invitations (account_id, property_id, email, role) values ($1,$2,'x@example.org','MEMBER')",
          [ids.acctA, ids.propA],
        ),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("an admin pointing a stay at a member of B never notifies that member", async () => {
    const before = await count(
      "select 1 from public.notifications where recipient_member_id = $1",
      [ids.bMember],
    );
    const [b] = await asCommitted<{ id: string }>(
      db,
      who("aOwner"),
      "insert into public.bookings (property_id, requester_name, requester_member_id, start_date, end_date) values ($1,'x',$2, current_date + 180, current_date + 181) returning id",
      [ids.propA, ids.bMember],
    );
    await asCommitted(
      db,
      who("aOwner"),
      "update public.bookings set status = 'CONFIRMED' where id = $1",
      [b!.id],
    );
    expect(
      await count("select 1 from public.notifications where recipient_member_id = $1", [
        ids.bMember,
      ]),
    ).toBe(before);
    expect(
      await as(db, who("bMember"), (q) => q("select id from public.notifications")),
    ).toHaveLength(0);
  });

  it("G1: a plain member can't file a handover in someone else's name, or date it ahead", async () => {
    const propE = await val<string>(
      "insert into public.properties (account_id, name, address) values ($1,'Chata E','Addr E') returning id",
      [ids.acctA],
    );
    await expect(
      asCommitted(
        db,
        who("aMember"),
        "insert into public.handovers (property_id, member_id, checklist_state, note) values ($1,$2,'{}','Klic je pod rohozkou')",
        [propE, ids.ownerA],
      ),
    ).rejects.toThrow(/row-level security/);
    await expect(
      asCommitted(
        db,
        who("aMember"),
        "insert into public.handovers (property_id, member_id, checklist_state, submitted_at) values ($1,$2,'{}', now() + interval '30 days')",
        [propE, ids.aMember],
      ),
    ).rejects.toThrow(/row-level security/);
    const [h] = await asCommitted<{ id: string }>(
      db,
      who("aMember"),
      "insert into public.handovers (property_id, member_id, checklist_state) values ($1,$2,'{}') returning id",
      [propE, ids.aMember],
    );
    await expect(
      asCommitted(db, who("aMember"), "update public.handovers set member_id = $2 where id = $1", [
        h!.id,
        ids.ownerA,
      ]),
    ).rejects.toThrow(/row-level security/);
  });

  it("G2: a handover naming a member of another account doesn't put their name in A's notification", async () => {
    const propF = await val<string>(
      "insert into public.properties (account_id, name, address) values ($1,'Chata F','Addr F') returning id",
      [ids.acctA],
    );
    await admin(
      db,
      "insert into public.bookings (property_id, requester_name, requester_member_id, start_date, end_date, status) values ($1,'Jana',$2, current_date + 2, current_date + 3, 'CONFIRMED')",
      [propF, ids.aSecond],
    );
    // Only an admin may write a handover for someone else; even then B's name stays out.
    await asCommitted(
      db,
      who("aOwner"),
      "insert into public.handovers (property_id, member_id, checklist_state) values ($1,$2,'{}')",
      [propF, ids.bMember],
    );
    const rows = (await admin(
      db,
      "select payload from public.notifications where kind = 'leaving_checklist' and payload->>'property_name' = 'Chata F'",
    )) as { payload: { from_name: string | null } }[];
    expect(rows).toHaveLength(1);
    expect(rows.map((r) => r.payload.from_name)).not.toContain("Boris");
  });

  it("G3: an invitation with B's cottage id doesn't put B's cottage name in the e-mail", async () => {
    await asCommitted(
      db,
      who("aOwner"),
      "insert into public.invitations (account_id, property_id, email, role, created_by_member_id) values ($1,$2,'me2@example.org','MEMBER',$3)",
      [ids.acctA, ids.propB, ids.ownerA],
    );
    const [n] = (await admin(
      db,
      "select payload from public.notifications where kind = 'invitation' and recipient_email = 'me2@example.org'",
    )) as { payload: { property_name: string | null } }[];
    expect(n).toBeTruthy();
    expect(n!.payload.property_name ?? null).not.toBe("Tajna Chata B");
  });

  it("an admin of A cannot point a guest request at an outsider's sign-in (0034 guard holds)", async () => {
    const g = await val<string>(
      "insert into public.guest_requests (property_id, guest_name, start_date, end_date, guests, status) values ($1,'Host', current_date + 200, current_date + 201, 1, 'PENDING') returning id",
      [ids.propA],
    );
    await asCommitted(
      db,
      who("aOwner"),
      "update public.guest_requests set requester_user_id = $2, source = 'public_calendar' where id = $1",
      [g, U.bMember],
    );
    expect(
      await val("select requester_user_id from public.guest_requests where id = $1", [g]),
    ).toBeNull();
    await asCommitted(db, who("aOwner"), "select public.decide_guest_request($1, false)", [g]);
    const seen = await as(db, who("bMember"), (q) =>
      q("select payload from public.notifications where kind = 'guest_request_decided'"),
    );
    expect(seen).toHaveLength(0);
  });
});

describe("task_notes and task_note_mentions", () => {
  const sel = (k: Who) =>
    as(db, who(k), (q) =>
      q<{ id: string }>("select id from public.task_notes where id = $1", [ids.memberNote]),
    );
  const selM = (k: Who) =>
    as(db, who(k), (q) =>
      q("select * from public.task_note_mentions where note_id = $1", [ids.memberNote]),
    );

  it("select: members and admins of A; not B, not the leaver, not anon", async () => {
    for (const k of ["aOwner", "aAdmin", "aMember", "aSecond"] as Who[]) {
      expect(await sel(k), k).toHaveLength(1);
      expect(await selM(k), k).toHaveLength(1);
    }
    for (const k of ["bMember", "bAdmin", "leaver"] as Who[]) {
      expect(await sel(k), k).toHaveLength(0);
      expect(await selM(k), k).toHaveLength(0);
    }
    await expect(as(db, anon, (q) => q("select id from public.task_notes"))).rejects.toThrow(
      /permission denied/,
    );
    await expect(as(db, anon, (q) => q("select * from public.task_note_mentions"))).rejects.toThrow(
      /permission denied/,
    );
  });

  it("update and delete: the author only (not the admin of A, not B)", async () => {
    const upd = "update public.task_notes set body = 'zmena' where id = $1 returning id";
    const del = "delete from public.task_notes where id = $1 returning id";
    for (const k of ["aOwner", "aAdmin", "aSecond", "bMember", "bAdmin", "leaver"] as Who[]) {
      expect(await as(db, who(k), (q) => q(upd, [ids.memberNote])), k).toHaveLength(0);
      expect(await as(db, who(k), (q) => q(del, [ids.memberNote])), k).toHaveLength(0);
    }
    expect(await as(db, who("aMember"), (q) => q(upd, [ids.memberNote]))).toHaveLength(1);
    expect(await as(db, who("aMember"), (q) => q(del, [ids.memberNote]))).toHaveLength(1);
    for (const col of ["author_member_id = $2", "account_id = $2", "task_id = $2"]) {
      await expect(
        as(db, who("aMember"), (q) =>
          q(`update public.task_notes set ${col} where id = $1`, [ids.memberNote, ids.acctB]),
        ),
        col,
      ).rejects.toThrow(/permission denied/);
    }
    await expect(as(db, anon, (q) => q(upd, [ids.memberNote]))).rejects.toThrow(
      /permission denied/,
    );
    await expect(as(db, anon, (q) => q(del, [ids.memberNote]))).rejects.toThrow(
      /permission denied/,
    );
  });

  it("a member who left can no longer edit a note they wrote", async () => {
    const leaverNote = await val<string>(
      "insert into public.task_notes (account_id, task_id, author_member_id, body) values ($1,$2,$3,'stara') returning id",
      [ids.acctA, ids.task, ids.leaver],
    );
    expect(
      await as(db, who("leaver"), (q) =>
        q("update public.task_notes set body = 'x' where id = $1 returning id", [leaverNote]),
      ),
    ).toHaveLength(0);
  });

  it("nobody inserts notes or mentions directly; mentions are never writable", async () => {
    for (const persona of [anon, ...AUTH.map(who)]) {
      await expect(
        as(db, persona, (q) =>
          q(
            "insert into public.task_notes (account_id, task_id, author_member_id, body) values ($1,$2,$3,'x')",
            [ids.acctA, ids.task, ids.aMember],
          ),
        ),
      ).rejects.toThrow(/permission denied/);
      await expect(
        as(db, persona, (q) =>
          q(
            "insert into public.task_note_mentions (note_id, member_id, account_id) values ($1,$2,$3)",
            [ids.memberNote, ids.bMember, ids.acctA],
          ),
        ),
      ).rejects.toThrow(/permission denied/);
      await expect(
        as(db, persona, (q) => q("delete from public.task_note_mentions")),
      ).rejects.toThrow(/permission denied/);
      await expect(
        as(db, persona, (q) => q("update public.task_note_mentions set member_id = member_id")),
      ).rejects.toThrow(/permission denied/);
    }
  });

  it("add_task_note: members and admins of A; not B, leaver, anon; no mention of B", async () => {
    for (const k of ["aAdmin", "aMember"] as Who[]) {
      const r = await as(db, who(k), (q) =>
        q<{ id: string }>("select public.add_task_note($1, 'ok', $2) as id", [
          ids.task,
          [ids.aSecond],
        ]),
      );
      expect(r[0]!.id, k).toBeTruthy();
    }
    for (const k of ["bMember", "bAdmin", "leaver"] as Who[]) {
      await expect(
        as(db, who(k), (q) => q("select public.add_task_note($1, 'x')", [ids.task])),
        k,
      ).rejects.toThrow(/not_a_member/);
    }
    await expect(
      as(db, who("aMember"), (q) =>
        q("select public.add_task_note($1, 'x', $2)", [ids.task, [ids.aSecond, ids.bMember]]),
      ),
    ).rejects.toThrow(/mention_not_in_account/);
    await expect(
      as(db, who("aMember"), (q) =>
        q("select public.add_task_note($1, 'x', $2)", [ids.task, Array(21).fill(ids.aSecond)]),
      ),
    ).rejects.toThrow(/too_many_mentions/);
    await expect(
      as(db, anon, (q) => q("select public.add_task_note($1, 'x')", [ids.task])),
    ).rejects.toThrow(/permission denied/);
  });
});

describe("message_admins, remind_debt, handover_next_recipient", () => {
  it("message_admins: refused for B, the leaver and anon", async () => {
    for (const k of ["bMember", "bAdmin", "leaver"] as Who[]) {
      await expect(
        as(db, who(k), (q) => q("select public.message_admins($1, 'x')", [ids.acctA])),
        k,
      ).rejects.toThrow(/not_a_member/);
    }
    await expect(
      as(db, anon, (q) => q("select public.message_admins($1, 'x')", [ids.acctA])),
    ).rejects.toThrow(/permission denied/);
    // An admin writing reaches the other admins only, never themself.
    const r = await as(db, who("aAdmin"), (q) =>
      q<{ n: number }>("select public.message_admins($1, 'x') as n", [ids.acctA]),
    );
    expect(r[0]!.n).toBe(1);
  });

  it("remind_debt: refused for B, the leaver, anon, and for a target in B", async () => {
    for (const k of ["bMember", "bAdmin", "leaver"] as Who[]) {
      await expect(
        as(db, who(k), (q) => q("select public.remind_debt($1,$2)", [ids.propA, ids.aMember])),
        k,
      ).rejects.toThrow(/not_a_member/);
    }
    await expect(
      as(db, who("aMember"), (q) =>
        q("select public.remind_debt($1,$2)", [ids.propA, ids.bMember]),
      ),
    ).rejects.toThrow(/member_not_in_account/);
    await expect(
      as(db, who("aMember"), (q) =>
        q("select public.remind_debt($1,$2)", [ids.propB, ids.bMember]),
      ),
    ).rejects.toThrow(/not_a_member/);
    await expect(
      as(db, anon, (q) => q("select public.remind_debt($1,$2)", [ids.propA, ids.aMember])),
    ).rejects.toThrow(/permission denied/);
  });

  it("handover_next_recipient: members and admins of A; not B, the leaver or anon", async () => {
    const h = await val<string>(
      "insert into public.handovers (property_id, member_id, checklist_state) values ($1,$2,'{}') returning id",
      [ids.propA, ids.ownerA],
    );
    for (const k of ["aOwner", "aAdmin", "aMember"] as Who[]) {
      await expect(
        as(db, who(k), (q) => q("select * from public.handover_next_recipient($1)", [h])),
        k,
      ).resolves.toBeDefined();
    }
    for (const k of ["bMember", "bAdmin", "leaver"] as Who[]) {
      await expect(
        as(db, who(k), (q) => q("select * from public.handover_next_recipient($1)", [h])),
        k,
      ).rejects.toThrow(/not_a_member/);
    }
    await expect(
      as(db, anon, (q) => q("select * from public.handover_next_recipient($1)", [h])),
    ).rejects.toThrow(/permission denied/);
  });
});

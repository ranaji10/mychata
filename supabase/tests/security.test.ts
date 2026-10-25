/**
 * Row-level security and public-access tests. Runs every migration on an in-memory
 * Postgres, then acts as anon / members / admins of two accounts and checks what each
 * can see and change. Each test is rolled back, so tests don't affect each other.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { admin, as, asCommitted, freshDb, type Db } from "./harness";

const U = {
  aAdmin: "10000000-0000-4000-8000-00000000000a",
  aMember: "10000000-0000-4000-8000-00000000000b",
  bAdmin: "10000000-0000-4000-8000-00000000000c",
  newcomer: "10000000-0000-4000-8000-00000000000d",
};
const EMAIL = {
  aAdmin: "anna@example.org",
  aMember: "petr@example.org",
  bAdmin: "bara@example.org",
  newcomer: "nova@example.org",
};
let db: Db;
const ids: Record<string, string> = {};

async function one<T = Record<string, unknown>>(rows: Promise<T[]>): Promise<T> {
  const r = await rows;
  return r[0] as T;
}

beforeAll(async () => {
  db = await freshDb();
  // Account A (family) created through onboarding by aAdmin.
  const [pa] = await asCommitted<{ create_account_onboarding: string }>(
    db,
    { role: "authenticated", userId: U.aAdmin, email: EMAIL.aAdmin },
    "select public.create_account_onboarding('FAMILY','Rodina A','Chata A','Addr A',null,4,'{}',null,'Klic je pod rohozkou') as create_account_onboarding",
  );
  ids.propA = pa!.create_account_onboarding;
  const acctA = await admin(db, "select account_id from public.properties where id = $1", [
    ids.propA,
  ]);
  ids.acctA = (acctA[0] as { account_id: string }).account_id;
  // Account B (institution) for bAdmin, done as superuser for brevity.
  const b = await admin(
    db,
    "insert into public.accounts (type, name) values ('INSTITUTIONAL','Klub B') returning id",
  );
  ids.acctB = (b[0] as { id: string }).id;
  const pb = await admin(
    db,
    "insert into public.properties (account_id, name, address, public_calendar_enabled) values ($1,'Chata B','Addr B', true) returning id, public_token",
    [ids.acctB],
  );
  ids.propB = (pb[0] as { id: string }).id;
  ids.tokenB = (pb[0] as { public_token: string }).public_token;
  const mb = await admin(
    db,
    "insert into public.members (account_id, name, email, role, user_id) values ($1,'Bara',$2,'ADMIN',$3) returning id",
    [ids.acctB, EMAIL.bAdmin, U.bAdmin],
  );
  ids.memberBAdmin = (mb[0] as { id: string }).id;
  // aMember joins A as plain member.
  const ma = await admin(
    db,
    "insert into public.members (account_id, name, email, role, user_id) values ($1,'Petr',$2,'MEMBER',$3) returning id",
    [ids.acctA, EMAIL.aMember, U.aMember],
  );
  ids.memberAMember = (ma[0] as { id: string }).id;
  const aa = await admin(db, "select id from public.members where user_id = $1", [U.aAdmin]);
  ids.memberAAdmin = (aa[0] as { id: string }).id;
  const tok = await admin(db, "select public_token from public.properties where id = $1", [
    ids.propA,
  ]);
  ids.tokenA = (tok[0] as { public_token: string }).public_token;
  // Fixtures in A: a booking by the admin, an expense paid by the admin with a split owed by Petr,
  // a members-only manual section, an admin-only document, and a manual chunk.
  const bk = await admin(
    db,
    "insert into public.bookings (property_id, requester_name, requester_member_id, start_date, end_date) values ($1,'Anna',$2, current_date + 10, current_date + 12) returning id",
    [ids.propA, ids.memberAAdmin],
  );
  ids.bookingA = (bk[0] as { id: string }).id;
  const ex = await admin(
    db,
    "insert into public.expenses (property_id, amount, paid_by_member_id) values ($1, 1000, $2) returning id",
    [ids.propA, ids.memberAAdmin],
  );
  ids.expenseA = (ex[0] as { id: string }).id;
  await admin(
    db,
    "insert into public.expense_splits (expense_id, member_id, amount_owed) values ($1,$2,500)",
    [ids.expenseA, ids.memberAMember],
  );
  await admin(
    db,
    "insert into public.manual_sections (property_id, title_cs, title_en, content_cs, content_en, visibility) values ($1,'Wi-Fi','Wi-Fi','heslo tajne123','password secret123','MEMBERS_ONLY')",
    [ids.propA],
  );
  await admin(
    db,
    "insert into public.documents (property_id, title, file_url, visibility) values ($1,'Deed',$2,'ADMINS_ONLY')",
    [ids.propA, `${ids.propA}/deed.pdf`],
  );
  await admin(db, "insert into storage.objects (bucket_id, name) values ('my-chata-files', $1)", [
    `${ids.propA}/deed.pdf`,
  ]);
  await admin(
    db,
    "insert into public.manual_chunks (property_id, section_id, lang, content) select property_id, id, 'cs', content_cs from public.manual_sections where property_id = $1",
    [ids.propA],
  );
  const gl = await admin(
    db,
    "insert into public.guest_links (property_id, token) values ($1, 'guest-token-a') returning id",
    [ids.propA],
  );
  ids.guestLinkA = (gl[0] as { id: string }).id;
}, 120_000);

const anon = { role: "anon" as const };
const aAdmin = { role: "authenticated" as const, userId: U.aAdmin, email: EMAIL.aAdmin };
const aMember = { role: "authenticated" as const, userId: U.aMember, email: EMAIL.aMember };
const bAdmin = { role: "authenticated" as const, userId: U.bAdmin, email: EMAIL.bAdmin };
const newcomer = { role: "authenticated" as const, userId: U.newcomer, email: EMAIL.newcomer };

describe("tenant isolation", () => {
  it("a member of B sees none of A's bookings, expenses, manual or chunks", async () => {
    await as(db, bAdmin, async (q) => {
      expect(
        await q("select * from public.bookings where property_id = $1", [ids.propA]),
      ).toHaveLength(0);
      expect(
        await q("select * from public.expenses where property_id = $1", [ids.propA]),
      ).toHaveLength(0);
      expect(
        await q("select * from public.manual_sections where property_id = $1", [ids.propA]),
      ).toHaveLength(0);
      expect(
        await q("select * from public.manual_chunks where property_id = $1", [ids.propA]),
      ).toHaveLength(0);
      expect(
        await q("select * from public.search_manual($1, null, 'heslo', 'cs', 8)", [ids.propA]),
      ).toHaveLength(0);
    });
  });
  it("a member of A finds A's chunk through hybrid search", async () => {
    await as(db, aMember, async (q) => {
      const rows = await q("select * from public.search_manual($1, null, 'heslo', 'cs', 8)", [
        ids.propA,
      ]);
      expect(rows).toHaveLength(1);
    });
  });
  it("the old cross-tenant function is gone", async () => {
    const rows = await admin(db, "select 1 from pg_proc where proname = 'match_manual_chunks'");
    expect(rows).toHaveLength(0);
  });
});

describe("anonymous access", () => {
  it("cannot read manual sections or institutional requests directly", async () => {
    await as(db, anon, async (q) => {
      await expect(q("select * from public.manual_sections")).rejects.toThrow(/permission denied/);
      await expect(q("select * from public.institutional_requests")).rejects.toThrow(
        /permission denied/,
      );
    });
  });
  it("public manual by token returns only PUBLIC sections", async () => {
    await as(db, anon, async (q) => {
      const rows = await q<{ title_cs: string }>("select * from public.public_manual($1)", [
        ids.tokenA,
      ]);
      expect(rows.map((r) => r.title_cs)).toEqual(["Pravidla domu"]);
      expect(await q("select * from public.public_manual('wrong')")).toHaveLength(0);
    });
  });
  it("family calendar stays private until an admin switches it on", async () => {
    await as(db, anon, async (q) => {
      expect(await q("select * from public.public_calendar($1)", [ids.tokenA])).toHaveLength(0);
    });
    await as(db, aMember, async (q) => {
      await expect(q("select public.set_public_calendar($1, true)", [ids.propA])).rejects.toThrow(
        /Admin/,
      );
    });
    await as(db, aAdmin, async (q) => {
      await q("select public.set_public_calendar($1, true)", [ids.propA]);
      await q("set local role anon");
      expect(await q("select * from public.public_calendar($1)", [ids.tokenA])).toHaveLength(1);
    });
  });
  it("cannot call onboarding or admin functions", async () => {
    await as(db, anon, async (q) => {
      await expect(q("select public.create_account_onboarding('FAMILY','x','y')")).rejects.toThrow(
        /permission denied/,
      );
      await expect(
        q("select public.set_member_role($1,'ADMIN')", [ids.memberAMember]),
      ).rejects.toThrow(/permission denied/);
    });
  });
});

describe("guest and institutional forms", () => {
  it("a guest can submit through the link, and is rate limited", async () => {
    await as(db, anon, async (q) => {
      const s =
        "select public.submit_guest_request('guest-token-a','Host Hostovic','host@example.org', current_date + 20, current_date + 22, 2) as r";
      expect((await one(q<{ r: string }>(s))).r).toBe("ok");
      expect((await one(q<{ r: string }>(s))).r).toBe("ok");
      expect((await one(q<{ r: string }>(s))).r).toBe("ok");
      expect((await one(q<{ r: string }>(s))).r).toBe("rate");
      expect(
        (
          await one(
            q<{ r: string }>(
              "select public.submit_guest_request('nope','Ab','a@b.cz', current_date, current_date, 1) as r",
            ),
          )
        ).r,
      ).toBe("link");
    });
  });
  it("institution form works by token, flags conflicts, and refuses family tokens", async () => {
    await admin(
      db,
      "insert into public.bookings (property_id, requester_name, start_date, end_date) values ($1,'Club', current_date + 5, current_date + 8)",
      [ids.propB],
    );
    await as(db, anon, async (q) => {
      const r = await one(
        q<{ r: string }>(
          "select public.submit_institutional_request($1,'Jan Novak','jan@example.org','', 'student', current_date + 6, current_date + 7, 3) as r",
          [ids.tokenB],
        ),
      );
      expect(r.r).toBe("ok");
      const fam = await one(
        q<{ r: string }>(
          "select public.submit_institutional_request($1,'Jan Novak','jan@example.org','', '', current_date + 6, current_date + 7, 3) as r",
          [ids.tokenA],
        ),
      );
      expect(fam.r).toBe("link");
      await q("reset role");
      const rows = await q<{ has_conflict: boolean }>(
        "select has_conflict from public.institutional_requests where property_id = $1",
        [ids.propB],
      );
      expect(rows[0]?.has_conflict).toBe(true);
    });
  });
});

describe("roles", () => {
  it("a member cannot promote themselves", async () => {
    await as(db, aMember, async (q) => {
      await expect(
        q("update public.members set role = 'ADMIN' where user_id = $1", [U.aMember]),
      ).rejects.toThrow(/permission denied/);
      await expect(
        q("select public.set_member_role($1,'ADMIN')", [ids.memberAMember]),
      ).rejects.toThrow(/Admin/);
    });
  });
  it("an admin promotes and demotes, but never removes the owner (and so the last admin)", async () => {
    await as(db, aAdmin, async (q) => {
      await q("select public.set_member_role($1,'ADMIN')", [ids.memberAMember]);
      await q("select public.set_member_role($1,'MEMBER')", [ids.memberAMember]);
      // The founding admin is the account's OWNER since 0036 (D-22): the role is fixed.
      await expect(
        q("select public.set_member_role($1,'MEMBER')", [ids.memberAAdmin]),
      ).rejects.toThrow(/owner_role_is_fixed/);
      const log = await q("select action from public.audit_log where target_id = $1", [
        ids.memberAMember,
      ]);
      expect(log.length).toBe(2);
    });
  });
  it("an admin of B cannot change roles in A", async () => {
    await as(db, bAdmin, async (q) => {
      await expect(
        q("select public.set_member_role($1,'ADMIN')", [ids.memberAMember]),
      ).rejects.toThrow(/Admin/);
    });
  });
});

describe("row ownership", () => {
  it("a member cannot delete someone else's booking; the admin can", async () => {
    await as(db, aMember, async (q) => {
      await q("delete from public.bookings where id = $1", [ids.bookingA]);
    });
    expect(
      await admin(db, "select 1 from public.bookings where id = $1", [ids.bookingA]),
    ).toHaveLength(1);
    await as(db, aAdmin, async (q) => {
      await q("delete from public.bookings where id = $1", [ids.bookingA]);
      expect(await q("select 1 from public.bookings where id = $1", [ids.bookingA])).toHaveLength(
        0,
      );
    });
  });
  it("only the person owed confirms a repayment", async () => {
    await as(db, aMember, async (q) => {
      await q("update public.expense_splits set paid_back = true where expense_id = $1", [
        ids.expenseA,
      ]);
    });
    const r = await admin(db, "select paid_back from public.expense_splits where expense_id = $1", [
      ids.expenseA,
    ]);
    expect((r[0] as { paid_back: boolean }).paid_back).toBe(false);
  });
  it("admin-only document files are hidden from members", async () => {
    await as(db, aMember, async (q) => {
      expect(
        await q("select * from storage.objects where name like $1", [`${ids.propA}/%`]),
      ).toHaveLength(0);
    });
    await as(db, aAdmin, async (q) => {
      expect(
        await q("select * from storage.objects where name like $1", [`${ids.propA}/%`]),
      ).toHaveLength(1);
    });
  });
  it("members cannot read invitation tokens", async () => {
    await admin(
      db,
      "insert into public.invitations (account_id, role, token) values ($1,'ADMIN','invite-admin-token')",
      [ids.acctA],
    );
    await as(db, aMember, async (q) => {
      expect(await q("select * from public.invitations")).toHaveLength(0);
    });
  });
});

describe("multi-account membership", () => {
  it("someone already in B can accept an invitation to A and switch between them", async () => {
    await admin(
      db,
      "insert into public.invitations (account_id, role, token, email) values ($1,'MEMBER','invite-bara', $2)",
      [ids.acctA, EMAIL.bAdmin],
    );
    await as(db, bAdmin, async (q) => {
      const r = await one(
        q<{ m: string | null }>("select public.accept_invitation('invite-bara') as m"),
      );
      expect(r.m).not.toBeNull();
      expect((await one(q<{ a: string }>("select public.current_account_id() as a"))).a).toBe(
        ids.acctA,
      );
      expect(await q("select * from public.accounts")).toHaveLength(2);
      await q("select public.set_active_account($1)", [ids.acctB]);
      expect((await one(q<{ a: string }>("select public.current_account_id() as a"))).a).toBe(
        ids.acctB,
      );
      // Admin in B, plain member in A: admin rights follow the active account.
      expect((await one(q<{ x: boolean }>("select public.is_admin() as x"))).x).toBe(true);
      await q("select public.set_active_account($1)", [ids.acctA]);
      expect((await one(q<{ x: boolean }>("select public.is_admin() as x"))).x).toBe(false);
    });
  });
  it("an invitation addressed to one email cannot be used by another", async () => {
    await admin(
      db,
      "insert into public.invitations (account_id, role, token, email) values ($1,'MEMBER','invite-other','someone@example.org')",
      [ids.acctA],
    );
    await as(db, newcomer, async (q) => {
      await expect(q("select public.accept_invitation('invite-other')")).rejects.toThrow(
        /mismatch/,
      );
    });
  });
  it("cannot switch to an account you don't belong to", async () => {
    await as(db, newcomer, async (q) => {
      await expect(q("select public.set_active_account($1)", [ids.acctA])).rejects.toThrow(
        /not_a_member/,
      );
    });
  });
  it("usage limits count per user per day", async () => {
    await as(db, aMember, async (q) => {
      expect((await one(q<{ ok: boolean }>("select public.bump_usage('ai', 2) as ok"))).ok).toBe(
        true,
      );
      expect((await one(q<{ ok: boolean }>("select public.bump_usage('ai', 2) as ok"))).ok).toBe(
        true,
      );
      expect((await one(q<{ ok: boolean }>("select public.bump_usage('ai', 2) as ok"))).ok).toBe(
        false,
      );
    });
  });
});

describe("onboarding and joining (B-003)", () => {
  it("a person whose email an admin added is linked and skips onboarding", async () => {
    const joiner = "10000000-0000-4000-8000-0000000000ee";
    await admin(
      db,
      "insert into public.members (account_id, name, email, role) values ($1,'Joiner','joiner@example.org','MEMBER')",
      [ids.acctA],
    );
    await as(
      db,
      { role: "authenticated", userId: joiner, email: "joiner@example.org" },
      async (q) => {
        const [m] = await q<{ m: string | null }>("select public.claim_initial_membership() as m");
        expect(m?.m).not.toBeNull();
        const [p] = await q<{ done: boolean; acct: string }>(
          "select onboarding_completed_at is not null as done, active_account_id as acct from public.profiles where user_id = $1",
          [joiner],
        );
        expect(p?.done).toBe(true);
        expect(p?.acct).toBe(ids.acctA);
      },
    );
  });
  it("a plain member cannot add a chata to the shared account", async () => {
    await as(db, aMember, async (q) => {
      await expect(q("select public.add_property('X')")).rejects.toThrow(/Admin role required/);
    });
  });
  it("a plain member can create their own account and becomes its admin", async () => {
    await as(db, aMember, async (q) => {
      await q(
        "select public.create_account_onboarding('FAMILY','Moje','Moje chata','Ulice 1', null, 2, '{}', null, '')",
      );
      const [r] = await q<{ x: boolean }>("select public.is_admin() as x");
      expect(r?.x).toBe(true);
      const accts = await q("select * from public.accounts");
      expect(accts.length).toBe(2);
    });
  });
});

describe("profile phone (B-008)", () => {
  // The exact statement PostgREST runs for supabase.from("profiles").upsert(...).select().
  const upsert = `insert into public.profiles (user_id, display_name, phone, avatar_url)
    values ($1, $2, $3, null)
    on conflict (user_id) do update set user_id = excluded.user_id,
      display_name = excluded.display_name, phone = excluded.phone, avatar_url = excluded.avatar_url
    returning *`;
  const read = "select phone from public.profiles where user_id = $1";

  it("a saved phone is still there on the next request (existing profile row)", async () => {
    const [written] = await asCommitted<{ phone: string }>(db, aAdmin, upsert, [
      U.aAdmin,
      "Anna",
      "+420 777 111 222",
    ]);
    expect(written?.phone).toBe("+420 777 111 222");
    await as(db, aAdmin, async (q) => {
      expect(await q(read, [U.aAdmin])).toEqual([{ phone: "+420 777 111 222" }]);
    });
  });
  it("works the same for someone who has no profile row yet", async () => {
    expect(await admin(db, read, [U.aMember])).toHaveLength(0);
    await asCommitted(db, aMember, upsert, [U.aMember, "Petr", "+420 603 000 111"]);
    await as(db, aMember, async (q) => {
      expect(await q(read, [U.aMember])).toEqual([{ phone: "+420 603 000 111" }]);
    });
  });
  it("nobody else can read or overwrite it", async () => {
    await as(db, bAdmin, async (q) => {
      expect(await q(read, [U.aAdmin])).toHaveLength(0);
      await expect(q(upsert, [U.aAdmin, "X", "666"])).rejects.toThrow(/row-level security/);
    });
  });
});

describe("assignee list (B-010)", () => {
  // The query behind the task assignee and expense split lists (src/lib/account.tsx).
  const list =
    "select id, account_id from public.members where account_id = public.current_account_id()";

  it("a member of B never appears in A's list, even for someone in both accounts", async () => {
    await admin(
      db,
      "insert into public.invitations (account_id, role, token, email) values ($1,'MEMBER','invite-bara-b010', $2)",
      [ids.acctA, EMAIL.bAdmin],
    );
    await as(db, bAdmin, async (q) => {
      // Only in B: A's members are invisible, whatever the filter.
      expect(
        await q("select * from public.members where account_id = $1", [ids.acctA]),
      ).toHaveLength(0);

      await q("select public.accept_invitation('invite-bara-b010')");
      // Now in both. Row-level security shows both member lists, which is why the app
      // must filter by the active account...
      const visible = await q<{ account_id: string }>("select account_id from public.members");
      expect(new Set(visible.map((m) => m.account_id))).toEqual(new Set([ids.acctA, ids.acctB]));

      // ...and with A active, the list holds A's people only.
      const inA = await q<{ id: string; account_id: string }>(list);
      expect(inA.length).toBeGreaterThan(0);
      expect(inA.every((m) => m.account_id === ids.acctA)).toBe(true);
      expect(inA.map((m) => m.id)).not.toContain(ids.memberBAdmin);

      await q("select public.set_active_account($1)", [ids.acctB]);
      const inB = await q<{ id: string; account_id: string }>(list);
      expect(inB.every((m) => m.account_id === ids.acctB)).toBe(true);
      expect(inB.map((m) => m.id)).not.toContain(ids.memberAMember);
    });
  });
});

describe("invitations (T-019: B-011, B-012, B-013)", () => {
  it("an admin invitation saved in lower case still makes an admin", async () => {
    await admin(
      db,
      "insert into public.invitations (account_id, role, token, email) values ($1,'admin','t019-lower', $2)",
      [ids.acctA, EMAIL.newcomer],
    );
    expect(
      await admin(db, "select role from public.invitations where token = 't019-lower'"),
    ).toEqual([{ role: "ADMIN" }]);
    await as(db, newcomer, async (q) => {
      await q("select public.accept_invitation('t019-lower')");
      expect(await q("select role from public.members where user_id = $1", [U.newcomer])).toEqual([
        { role: "ADMIN" },
      ]);
    });
  });

  it("someone already in the account is promoted by an admin invitation, never demoted", async () => {
    await admin(
      db,
      "insert into public.invitations (account_id, role, token, email) values ($1,'ADMIN','t019-promote', $2), ($1,'MEMBER','t019-keep', $3)",
      [ids.acctA, EMAIL.aMember, EMAIL.aAdmin],
    );
    await as(db, aMember, async (q) => {
      await q("select public.accept_invitation('t019-promote')");
      expect(await q("select role from public.members where id = $1", [ids.memberAMember])).toEqual(
        [{ role: "ADMIN" }],
      );
    });
    await as(db, aAdmin, async (q) => {
      await q("select public.accept_invitation('t019-keep')");
      // A MEMBER invitation never demotes; the founder stays OWNER (0036).
      expect(await q("select role from public.members where id = $1", [ids.memberAAdmin])).toEqual([
        { role: "OWNER" },
      ]);
    });
  });

  it("unknown, expired and used links raise a specific error instead of 'success'", async () => {
    await admin(
      db,
      `insert into public.invitations (account_id, role, token, email, expires_at, status, accepted_by)
       values ($1,'MEMBER','t019-expired', $2, now() - interval '1 day', 'PENDING', null),
              ($1,'MEMBER','t019-used', $2, now() + interval '1 day', 'ACCEPTED', $3)`,
      [ids.acctA, EMAIL.newcomer, U.aMember],
    );
    await as(db, newcomer, async (q) => {
      await expect(q("select public.accept_invitation('t019-nope')")).rejects.toThrow(
        /invitation_not_found/,
      );
      await expect(q("select public.accept_invitation('t019-expired')")).rejects.toThrow(
        /invitation_expired/,
      );
      await expect(q("select public.accept_invitation('t019-used')")).rejects.toThrow(
        /invitation_used/,
      );
    });
  });

  it("the preview shows what the link is for, masks the email, and says if it fits", async () => {
    await admin(
      db,
      "insert into public.invitations (account_id, role, token, email, created_by_member_id) values ($1,'ADMIN','t019-preview', $2, $3)",
      [ids.acctA, EMAIL.newcomer, ids.memberAAdmin],
    );
    await as(db, anon, async (q) => {
      const p = await one(q("select * from public.invitation_preview('t019-preview')"));
      expect(p).toMatchObject({
        state: "valid",
        account_name: "Rodina A",
        role: "ADMIN",
        email_hint: "n***@example.org",
        email_matches: null,
      });
      expect(await one(q("select state from public.invitation_preview('t019-missing')"))).toEqual({
        state: "not_found",
      });
    });
    await as(db, bAdmin, async (q) => {
      const p = await one(
        q<{ email_matches: boolean }>(
          "select email_matches from public.invitation_preview('t019-preview')",
        ),
      );
      expect(p.email_matches).toBe(false);
    });
    await as(db, newcomer, async (q) => {
      const p = await one(
        q<{ email_matches: boolean }>(
          "select email_matches from public.invitation_preview('t019-preview')",
        ),
      );
      expect(p.email_matches).toBe(true);
    });
  });
});

describe("demo data removed (T-012, migration 0019)", () => {
  const demo = ["a0000000-0000-4000-8000-000000000001", "a0000000-0000-4000-8000-000000000002"];
  it("the seeded demo accounts are gone, with a copy kept out of reach of the API", async () => {
    expect(await admin(db, "select id from public.accounts where id = any($1)", [demo])).toEqual(
      [],
    );
    expect(
      await admin(db, "select count(*)::int as n from demo_archive.accounts where id = any($1)", [
        demo,
      ]),
    ).toEqual([{ n: 2 }]);
    await as(db, anon, async (q) => {
      await expect(q("select * from demo_archive.accounts")).rejects.toThrow(/permission denied/);
    });
    await as(db, aAdmin, async (q) => {
      await expect(q("select * from demo_archive.members")).rejects.toThrow(/permission denied/);
    });
  });
});

describe("walkthrough fixes (T-021, migration 0022)", () => {
  it("only an admin decides a guest request, and approving writes the booking once", async () => {
    const r = await admin(
      db,
      "insert into public.guest_requests (guest_link_id, property_id, guest_name, start_date, end_date, guests) values ($1,$2,'Host T021', current_date + 40, current_date + 42, 2) returning id",
      [ids.guestLinkA, ids.propA],
    );
    const reqId = (r[0] as { id: string }).id;
    await as(db, aMember, async (q) => {
      await expect(q("select public.decide_guest_request($1, true)", [reqId])).rejects.toThrow(
        /Admin/,
      );
    });
    await as(db, bAdmin, async (q) => {
      await expect(q("select public.decide_guest_request($1, true)", [reqId])).rejects.toThrow(
        /Admin/,
      );
    });
    await as(db, aAdmin, async (q) => {
      await q("select public.decide_guest_request($1, true)", [reqId]);
      expect(
        await q("select 1 from public.bookings where requester_name = 'Host T021'"),
      ).toHaveLength(1);
      await expect(q("select public.decide_guest_request($1, true)", [reqId])).rejects.toThrow(
        /already_decided/,
      );
    });
  });

  it("settling marks both directions paid, and only the receiver or an admin may do it", async () => {
    // Petr also paid 200 that Anna owes half of: net Petr owes Anna 400.
    const ex = await admin(
      db,
      "insert into public.expenses (property_id, amount, paid_by_member_id) values ($1, 200, $2) returning id",
      [ids.propA, ids.memberAMember],
    );
    await admin(
      db,
      "insert into public.expense_splits (expense_id, member_id, amount_owed) values ($1,$2,100)",
      [(ex[0] as { id: string }).id, ids.memberAAdmin],
    );
    await as(db, aMember, async (q) => {
      await expect(
        q("select public.settle_debt($1,$2,$3)", [ids.propA, ids.memberAMember, ids.memberAAdmin]),
      ).rejects.toThrow(/only_receiver_confirms/);
    });
    await as(db, bAdmin, async (q) => {
      await expect(
        q("select public.settle_debt($1,$2,$3)", [ids.propA, ids.memberAMember, ids.memberAAdmin]),
      ).rejects.toThrow(/not_a_member/);
    });
    await as(db, aAdmin, async (q) => {
      const [row] = await q<{ n: number }>("select public.settle_debt($1,$2,$3) as n", [
        ids.propA,
        ids.memberAMember,
        ids.memberAAdmin,
      ]);
      expect(row!.n).toBe(2);
      const open = await q(
        "select 1 from public.expense_splits s join public.expenses e on e.id = s.expense_id where e.property_id = $1 and not s.paid_back",
        [ids.propA],
      );
      expect(open).toHaveLength(0);
    });
  });

  it("only an admin fills in cottage details", async () => {
    await as(db, aMember, async (q) => {
      await expect(
        q("select public.update_property_details($1, 'Nova 1')", [ids.propA]),
      ).rejects.toThrow(/Admin/);
    });
    await as(db, aAdmin, async (q) => {
      await q("select public.update_property_details($1, null, 'Jičín', 5, '{summer}', 8)", [
        ids.propA,
      ]);
      const [p] = await q<{ city: string; rooms: number; address: string }>(
        "select city, rooms, address from public.properties where id = $1",
        [ids.propA],
      );
      expect(p).toMatchObject({ city: "Jičín", rooms: 5, address: "Addr A" });
    });
  });

  it("members never read the text of admin-only documents", async () => {
    await admin(
      db,
      "update public.documents set extracted_text = 'deed text' where title = 'Deed'",
    );
    await as(db, aMember, async (q) => {
      expect(await q("select extracted_text from public.documents where title = 'Deed'")).toEqual(
        [],
      );
    });
  });
});

describe("checklists and defaults (T-018, migration 0024)", () => {
  const tasksJson = JSON.stringify([
    { title_cs: "Vypustit vodu", title_en: "Drain the water", assignee: null },
    { title_cs: "Zavřít okenice", title_en: "Close the shutters" },
  ]);
  it("adds a checklist with its tasks once per season, a second copy only when confirmed", async () => {
    await as(db, aMember, async (q) => {
      const [c] = await q<{ id: string }>(
        "select public.add_checklist($1,'winter','Zima','cs',$2::jsonb) as id",
        [ids.propA, tasksJson],
      );
      const tasks = await q<{ title: string; checklist_id: string; category: string }>(
        "select title, checklist_id, category from public.tasks where checklist_id = $1 order by title",
        [c!.id],
      );
      expect(tasks.map((t) => t.title)).toEqual(["Vypustit vodu", "Zavřít okenice"]);
      expect(tasks.every((t) => t.category === "seasonal")).toBe(true);
      await expect(
        q("select public.add_checklist($1,'winter','Zima','cs',$2::jsonb)", [ids.propA, tasksJson]),
      ).rejects.toThrow(/checklist_exists/);
      await q("select public.add_checklist($1,'winter','Zima','cs',$2::jsonb, true)", [
        ids.propA,
        tasksJson,
      ]);
    });
  });
  it("refuses other accounts and assignees from other accounts", async () => {
    await as(db, bAdmin, async (q) => {
      await expect(
        q("select public.add_checklist($1,'winter','Zima','cs',$2::jsonb)", [ids.propA, tasksJson]),
      ).rejects.toThrow(/not_a_member/);
    });
    await as(db, aMember, async (q) => {
      await expect(
        q("select public.add_checklist($1,'summer','Léto','cs',$2::jsonb)", [
          ids.propA,
          JSON.stringify([{ title_cs: "x", title_en: "x", assignee: ids.memberBAdmin }]),
        ]),
      ).rejects.toThrow(/assignee_not_in_account/);
    });
  });
  it("a booking with only dates gets the member as booker; confirmed only where the chata auto-confirms", async () => {
    await as(db, aMember, async (q) => {
      const [b] = await q<{ requester_member_id: string; requester_name: string; status: string }>(
        "insert into public.bookings (property_id, start_date, end_date) values ($1, current_date + 60, current_date + 62) returning requester_member_id, requester_name, status",
        [ids.propA],
      );
      expect(b).toMatchObject({
        requester_member_id: ids.memberAMember,
        requester_name: "Petr",
        status: "CONFIRMED",
      });
    });
    await admin(db, "update public.properties set auto_confirm = false where id = $1", [ids.propA]);
    try {
      await as(db, aMember, async (q) => {
        const [b] = await q<{ status: string }>(
          "insert into public.bookings (property_id, start_date, end_date, status) values ($1, current_date + 70, current_date + 72, 'CONFIRMED') returning status",
          [ids.propA],
        );
        expect(b!.status).toBe("PENDING");
      });
      await as(db, aAdmin, async (q) => {
        const [b] = await q<{ status: string }>(
          "insert into public.bookings (property_id, start_date, end_date, status) values ($1, current_date + 80, current_date + 82, 'CONFIRMED') returning status",
          [ids.propA],
        );
        expect(b!.status).toBe("CONFIRMED");
      });
    } finally {
      await admin(db, "update public.properties set auto_confirm = true where id = $1", [
        ids.propA,
      ]);
    }
  });
  it("only the payer or an admin covers an expense, and it is audited", async () => {
    await as(db, aMember, async (q) => {
      await expect(q("select public.cover_expense($1)", [ids.expenseA])).rejects.toThrow(
        /only_payer_covers/,
      );
    });
    await as(db, bAdmin, async (q) => {
      await expect(q("select public.cover_expense($1)", [ids.expenseA])).rejects.toThrow(
        /not_a_member/,
      );
    });
    await as(db, aAdmin, async (q) => {
      const [r] = await q<{ n: number }>("select public.cover_expense($1) as n", [ids.expenseA]);
      expect(r!.n).toBe(1);
      const log = await q(
        "select 1 from public.audit_log where action = 'expense_covered' and target_id = $1",
        [ids.expenseA],
      );
      expect(log).toHaveLength(1);
    });
  });
  it("a new task without an assignee goes to its creator; an explicit null stays unassigned", async () => {
    await as(db, aMember, async (q) => {
      const [a] = await q<{ assignee_member_id: string | null }>(
        "insert into public.tasks (property_id, title) values ($1, 'Default') returning assignee_member_id",
        [ids.propA],
      );
      expect(a!.assignee_member_id).toBe(ids.memberAMember);
      const [b] = await q<{ assignee_member_id: string | null }>(
        "insert into public.tasks (property_id, title, assignee_member_id) values ($1, 'Nobody', null) returning assignee_member_id",
        [ids.propA],
      );
      expect(b!.assignee_member_id).toBeNull();
    });
  });
});

describe("bugs of 17 Oct (T-035, migration 0026)", () => {
  it("a group link works only for emails on the batch, each accepting their own row", async () => {
    await admin(
      db,
      `insert into public.invitations (account_id, role, token, email, group_token, created_by_member_id)
       values ($1,'MEMBER','t035-row-nova', $2, 't035-group', $4),
              ($1,'MEMBER','t035-row-bara', $3, 't035-group', $4)`,
      [ids.acctA, EMAIL.newcomer, EMAIL.bAdmin, ids.memberAAdmin],
    );
    await as(db, anon, async (q) => {
      const p = await one(q("select * from public.invitation_preview('t035-group')"));
      expect(p).toMatchObject({
        state: "valid",
        account_name: "Rodina A",
        email_hint: "b***@example.org, n***@example.org",
        email_matches: null,
      });
    });
    await as(db, aMember, async (q) => {
      expect(
        await one(q("select email_matches from public.invitation_preview('t035-group')")),
      ).toEqual({ email_matches: false });
      await expect(q("select public.accept_invitation('t035-group')")).rejects.toThrow(
        /invitation_email_mismatch/,
      );
    });
    await as(db, newcomer, async (q) => {
      expect(
        await one(q("select email_matches from public.invitation_preview('t035-group')")),
      ).toEqual({ email_matches: true });
      await q("select public.accept_invitation('t035-group')");
      expect(
        await q("select account_id from public.members where user_id = $1", [U.newcomer]),
      ).toEqual([{ account_id: ids.acctA }]);
      // Only Nova's own row is used; Bára's stays open (read back as superuser).
      await q("reset role");
      const rows = await q(
        "select email, status from public.invitations where group_token = 't035-group' order by email",
      );
      expect(rows).toEqual([
        { email: EMAIL.bAdmin, status: "PENDING" },
        { email: EMAIL.newcomer, status: "ACCEPTED" },
      ]);
    });
  });

  it("another account cannot take over a group link (PR #46 review)", async () => {
    await admin(
      db,
      `insert into public.invitations (account_id, role, token, email, group_token, created_by_member_id)
       values ($1,'MEMBER','t035-own-row', $2, 't035-owned-group', $3)`,
      [ids.acctA, EMAIL.newcomer, ids.memberAAdmin],
    );
    await as(db, bAdmin, async (q) => {
      // Its group_token used as a single token in account B …
      await expect(
        q(
          `insert into public.invitations (account_id, role, token) values ($1,'MEMBER','t035-owned-group')`,
          [ids.acctB],
        ),
      ).rejects.toThrow(/invitation_token_taken/);
      // … or as account B's own group_token for the same people.
      await expect(
        q(
          `insert into public.invitations (account_id, role, token, email, group_token)
           values ($1,'MEMBER','t035-b-row', $2, 't035-owned-group')`,
          [ids.acctB, EMAIL.newcomer],
        ),
      ).rejects.toThrow(/invitation_token_taken/);
      // … nor by moving an existing row onto it.
      await q(
        `insert into public.invitations (account_id, role, token) values ($1,'MEMBER','t035-b-plain')`,
        [ids.acctB],
      );
      await expect(
        q(
          `update public.invitations set group_token = 't035-owned-group' where token = 't035-b-plain'`,
        ),
      ).rejects.toThrow(/invitation_token_taken/);
      // A single token can't become a group token either.
      await expect(
        q(
          `update public.invitations set group_token = 't035-own-row' where token = 't035-b-plain'`,
        ),
      ).rejects.toThrow(/invitation_token_taken/);
    });
  });

  it("an unknown group link is not found", async () => {
    await as(db, newcomer, async (q) => {
      await expect(q("select public.accept_invitation('t035-nothing')")).rejects.toThrow(
        /invitation_not_found/,
      );
    });
  });

  it("only an admin records the overlap answer, and 'no' clears the limit", async () => {
    await as(db, aMember, async (q) => {
      await expect(q("select public.set_property_overlap($1, false)", [ids.propA])).rejects.toThrow(
        /Admin/,
      );
    });
    await as(db, bAdmin, async (q) => {
      await expect(
        q("select public.set_property_overlap($1, true, 5)", [ids.propA]),
      ).rejects.toThrow(/Admin/);
    });
    await as(db, aAdmin, async (q) => {
      await q("select public.set_property_overlap($1, true, 6)", [ids.propA]);
      expect(
        await q("select overlap_allowed, overlap_max_guests from public.properties where id = $1", [
          ids.propA,
        ]),
      ).toEqual([{ overlap_allowed: true, overlap_max_guests: 6 }]);
      await q("select public.set_property_overlap($1, false)", [ids.propA]);
      expect(
        await q("select overlap_allowed, overlap_max_guests from public.properties where id = $1", [
          ids.propA,
        ]),
      ).toEqual([{ overlap_allowed: false, overlap_max_guests: null }]);
    });
  });

  it("only an admin with a work email turns a family account into an institution", async () => {
    await as(db, aMember, async (q) => {
      await expect(
        q("select public.convert_account_to_institution($1, 'Spolek A')", [ids.acctA]),
      ).rejects.toThrow(/Admin/);
    });
    await as(db, { ...aAdmin, email: "anna@gmail.com" }, async (q) => {
      await expect(
        q("select public.convert_account_to_institution($1, 'Spolek A')", [ids.acctA]),
      ).rejects.toThrow(/institution_email_required/);
    });
    await as(db, aAdmin, async (q) => {
      await q("select public.convert_account_to_institution($1, 'Spolek A')", [ids.acctA]);
      expect(await q("select type, name from public.accounts where id = $1", [ids.acctA])).toEqual([
        { type: "INSTITUTIONAL", name: "Spolek A" },
      ]);
    });
    await as(db, anon, async (q) => {
      await expect(
        q("select public.convert_account_to_institution($1, 'X')", [ids.acctA]),
      ).rejects.toThrow();
    });
  });

  // RLS audit of PR #46 (added by the rls-auditor).
  it("a group link refuses an expired or revoked row of the batch", async () => {
    await admin(
      db,
      `insert into public.invitations (account_id, role, token, email, group_token, expires_at, status)
       values ($1,'MEMBER','t035-exp-row', $2, 't035-exp', now() - interval '1 day', 'PENDING'),
              ($1,'MEMBER','t035-rev-row', $2, 't035-rev', now() + interval '1 day', 'REVOKED')`,
      [ids.acctA, EMAIL.newcomer],
    );
    await as(db, newcomer, async (q) => {
      await expect(q("select public.accept_invitation('t035-exp')")).rejects.toThrow(
        /invitation_expired/,
      );
      await expect(q("select public.accept_invitation('t035-rev')")).rejects.toThrow(
        /invitation_used/,
      );
      expect(await q("select 1 from public.members where user_id = $1", [U.newcomer])).toEqual([]);
    });
    await as(db, anon, async (q) => {
      expect(await one(q("select state from public.invitation_preview('t035-exp')"))).toEqual({
        state: "expired",
      });
    });
  });

  it("another account's admin cannot flip overlap or convert the account; anon cannot call either", async () => {
    await as(db, bAdmin, async (q) => {
      await expect(
        q("select public.convert_account_to_institution($1, 'Spolek X')", [ids.acctA]),
      ).rejects.toThrow(/Admin/);
    });
    await as(db, anon, async (q) => {
      await expect(
        q("select public.set_property_overlap($1, true, 3)", [ids.propA]),
      ).rejects.toThrow(/permission denied/);
    });
    expect(
      await admin(db, "select type, name from public.accounts where id = $1", [ids.acctA]),
    ).toEqual([{ type: "FAMILY", name: "Rodina A" }]);
  });

  // Was a gap in the first draft of 0026, closed by invitations_token_guard: group_token is chosen by the client, so an
  // admin of another account who knows a batch's link (e.g. was invited in it) can add rows with
  // the same group_token. accept_invitation() picks the newest matching row, so the invitee who
  // opens account A's link would join account B instead.
  it("a group token cannot be reused by another account", async () => {
    await admin(
      db,
      `insert into public.invitations (account_id, role, token, email, group_token)
       values ($1,'MEMBER','t035-hj-row', $2, 't035-hijack')`,
      [ids.acctA, EMAIL.newcomer],
    );
    await as(db, bAdmin, async (q) => {
      await expect(
        q(
          `insert into public.invitations (account_id, role, token, email, group_token)
           values ($1,'ADMIN','t035-hj-evil', $2, 't035-hijack')`,
          [ids.acctB, EMAIL.newcomer],
        ),
      ).rejects.toThrow(/invitation_token_taken/);
    });
  });
});

describe("release check of 17 Oct (T-036, migration 0028)", () => {
  const bookAsMember = (
    q: <R = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<R[]>,
    start: number,
    end: number,
    guests = 2,
  ) =>
    q<{ status: string }>(
      `insert into public.bookings (property_id, requester_name, requester_member_id, start_date, end_date, guests, status)
       values ($1, 'Petr', $2, current_date + $3::int, current_date + $4::int, $5, 'CONFIRMED') returning status`,
      [ids.propA, ids.memberAMember, start, end, guests],
    );

  it("'No' to overlapping stays sends a member's overlapping booking to the admin", async () => {
    await admin(db, "update public.properties set overlap_allowed = false where id = $1", [
      ids.propA,
    ]);
    await as(db, aMember, async (q) => {
      // Anna's stay is current_date + 10 .. + 12 (seed).
      expect(await bookAsMember(q, 11, 14)).toEqual([{ status: "PENDING" }]);
    });
    await as(db, aMember, async (q) => {
      // Arriving the day Anna leaves is a changeover, not an overlap.
      expect(await bookAsMember(q, 12, 15)).toEqual([{ status: "CONFIRMED" }]);
      expect(await bookAsMember(q, 30, 32)).toEqual([{ status: "CONFIRMED" }]);
    });
    await as(db, aAdmin, async (q) => {
      // An admin's own booking is not held back.
      const r = await q<{ status: string }>(
        `insert into public.bookings (property_id, requester_name, requester_member_id, start_date, end_date, status)
         values ($1, 'Anna', $2, current_date + 11, current_date + 13, 'CONFIRMED') returning status`,
        [ids.propA, ids.memberAAdmin],
      );
      expect(r).toEqual([{ status: "CONFIRMED" }]);
    });
    await admin(db, "update public.properties set overlap_allowed = null where id = $1", [
      ids.propA,
    ]);
  });

  it("an overlap within the guest limit is confirmed, above it waits for the admin", async () => {
    await admin(
      db,
      "update public.properties set overlap_allowed = true, overlap_max_guests = 5 where id = $1",
      [ids.propA],
    );
    await as(db, aMember, async (q) => {
      expect(await bookAsMember(q, 11, 14, 2)).toEqual([{ status: "CONFIRMED" }]);
    });
    await as(db, aMember, async (q) => {
      // Anna's seeded stay has the default guest count; 5 more is over the limit of 5.
      expect(await bookAsMember(q, 11, 14, 5)).toEqual([{ status: "PENDING" }]);
    });
    await admin(
      db,
      "update public.properties set overlap_allowed = null, overlap_max_guests = null where id = $1",
      [ids.propA],
    );
  });

  it("only the account's founder converts it to an organisation, not another admin", async () => {
    await admin(db, "update public.members set role = 'ADMIN' where id = $1", [ids.memberAMember]);
    await as(db, aMember, async (q) => {
      await expect(
        q("select public.convert_account_to_institution($1, 'Spolek A')", [ids.acctA]),
      ).rejects.toThrow(/owner_required/);
    });
    await admin(db, "update public.members set role = 'MEMBER' where id = $1", [ids.memberAMember]);
    await as(db, aAdmin, async (q) => {
      await q("select public.convert_account_to_institution($1, 'Spolek A')", [ids.acctA]);
      await q("reset role");
      expect(
        await q(
          "select action from public.audit_log where account_id = $1 and action = 'account_type_changed'",
          [ids.acctA],
        ),
      ).toEqual([{ action: "account_type_changed" }]);
    });
  });

  // --- RLS audit of 0028 (18 Oct) ---------------------------------------------------------

  it("nobody books into another account's cottage, or for another member", async () => {
    const ins = (prop: string, member: string | null) =>
      `insert into public.bookings (property_id, requester_name, requester_member_id, start_date, end_date, status)
       values ('${prop}', 'X', ${member ? `'${member}'` : "null"}, current_date + 40, current_date + 41, 'CONFIRMED') returning status`;
    await as(db, anon, async (q) => {
      await expect(q(ins(ids.propA, null))).rejects.toThrow();
    });
    await as(db, bAdmin, async (q) => {
      await expect(q(ins(ids.propA, ids.memberBAdmin))).rejects.toThrow(/row-level security/);
    });
    await as(db, aMember, async (q) => {
      await expect(q(ins(ids.propB, ids.memberAMember))).rejects.toThrow(/row-level security/);
      // Booking in Anna's name (pending or confirmed) is refused for a plain member.
      await expect(q(ins(ids.propA, ids.memberAAdmin))).rejects.toThrow(/row-level security/);
    });
    await as(db, aAdmin, async (q) => {
      await expect(q(ins(ids.propB, ids.memberAAdmin))).rejects.toThrow(/row-level security/);
    });
  });

  // Closed in 0028 after the RLS audit: the hold also runs on UPDATE and for a null requester.

  it("a member cannot confirm their own held booking with an UPDATE", async () => {
    await admin(db, "update public.properties set overlap_allowed = false where id = $1", [
      ids.propA,
    ]);
    try {
      await as(db, aMember, async (q) => {
        const [b] = await q<{ id: string; status: string }>(
          `insert into public.bookings (property_id, requester_name, requester_member_id, start_date, end_date, status)
           values ($1, 'Petr', $2, current_date + 11, current_date + 14, 'CONFIRMED') returning id, status`,
          [ids.propA, ids.memberAMember],
        );
        expect(b!.status).toBe("PENDING");
        const r = await q<{ status: string }>(
          "update public.bookings set status = 'CONFIRMED' where id = $1 returning status",
          [b!.id],
        ).catch(() => [{ status: "REFUSED" }]);
        expect(r).not.toEqual([{ status: "CONFIRMED" }]);
      });
    } finally {
      await admin(db, "update public.properties set overlap_allowed = null where id = $1", [
        ids.propA,
      ]);
    }
  });

  it("moving a confirmed stay onto another one is held; guests are counted per night", async () => {
    await admin(
      db,
      "update public.properties set overlap_allowed = true, overlap_max_guests = 5 where id = $1",
      [ids.propA],
    );
    try {
      await admin(
        db,
        `insert into public.bookings (property_id, requester_name, requester_member_id, start_date, end_date, guests, status)
         values ($1,'Anna',$2, current_date + 50, current_date + 52, 3, 'CONFIRMED'),
                ($1,'Anna',$2, current_date + 55, current_date + 58, 3, 'CONFIRMED')`,
        [ids.propA, ids.memberAAdmin],
      );
      await as(db, aMember, async (q) => {
        // 3 guests on any one night plus 2 is within the limit of 5, even though 6 overlap in total.
        const [b] = await q<{ id: string; status: string }>(
          `insert into public.bookings (property_id, requester_name, requester_member_id, start_date, end_date, guests, status)
           values ($1, 'Petr', $2, current_date + 50, current_date + 60, 2, 'CONFIRMED') returning id, status`,
          [ids.propA, ids.memberAMember],
        );
        expect(b!.status).toBe("CONFIRMED");
        // Same booking with 4 guests: 3 + 4 on one night is over the limit.
        expect(
          await q("update public.bookings set guests = 4 where id = $1 returning status", [b!.id]),
        ).toEqual([{ status: "PENDING" }]);
      });
    } finally {
      await admin(
        db,
        "update public.properties set overlap_allowed = null, overlap_max_guests = null where id = $1",
        [ids.propA],
      );
    }
  });

  it("a member cannot dodge the hold with requester_member_id = null", async () => {
    await admin(db, "update public.properties set overlap_allowed = false where id = $1", [
      ids.propA,
    ]);
    try {
      await as(db, aMember, async (q) => {
        const r = await q<{ status: string }>(
          `insert into public.bookings (property_id, requester_name, requester_member_id, start_date, end_date, status)
           values ($1, 'Petr', null, current_date + 11, current_date + 14, 'CONFIRMED') returning status`,
          [ids.propA],
        ).catch(() => [{ status: "REFUSED" }]);
        expect(r).not.toEqual([{ status: "CONFIRMED" }]);
      });
    } finally {
      await admin(db, "update public.properties set overlap_allowed = null where id = $1", [
        ids.propA,
      ]);
    }
  });

  it("the founder rule cannot be gamed by writing members rows directly", async () => {
    await as(db, aAdmin, async (q) => {
      await expect(
        q("update public.members set created_at = now() - interval '10 years' where user_id = $1", [
          U.aAdmin,
        ]),
      ).rejects.toThrow(/permission denied/);
      expect(
        await q("delete from public.members where id = $1 returning id", [ids.memberAAdmin]),
      ).toEqual([]);
      await expect(
        q(
          "insert into public.members (account_id, name, email, role, user_id, created_at) values ($1,'X','x@example.org','OWNER',$2, now() - interval '10 years')",
          [ids.acctA, U.newcomer],
        ),
      ).rejects.toThrow(/row-level security/);
      await expect(
        q("select public.set_member_role($1, 'OWNER')", [ids.memberAMember]),
      ).rejects.toThrow(/bad_role/);
    });
    await as(db, anon, async (q) => {
      await expect(
        q("select public.convert_account_to_institution($1, 'Spolek A')", [ids.acctA]),
      ).rejects.toThrow(/permission denied/);
    });
    await as(db, aMember, async (q) => {
      await expect(
        q("select public.convert_account_to_institution($1, 'Spolek A')", [ids.acctA]),
      ).rejects.toThrow(/Admin role required/);
    });
    await as(db, bAdmin, async (q) => {
      await expect(
        q("select public.convert_account_to_institution($1, 'Spolek A')", [ids.acctA]),
      ).rejects.toThrow(/Admin role required/);
    });
    await as(db, { ...aAdmin, email: "anna@gmail.com" }, async (q) => {
      await expect(
        q("select public.convert_account_to_institution($1, 'Spolek A')", [ids.acctA]),
      ).rejects.toThrow(/institution_email_required/);
    });
  });

  // Closed in 0028: a co-admin cannot demote the founder.
  it("a co-admin cannot demote the founder", async () => {
    await as(db, aMember, async (q) => {
      await q("reset role");
      await q("update public.members set role = 'ADMIN' where id = $1", [ids.memberAMember]);
      await q("set local role authenticated");
      await expect(
        q("select public.set_member_role($1, 'MEMBER')", [ids.memberAAdmin]),
      ).rejects.toThrow();
    });
  });
});

describe("held bookings can be decided from the app (T-038)", () => {
  // A member's booking held back by the overlap rule (T-036), written as a fixture.
  const holdFixture = async () => {
    const [b] = await admin(
      db,
      `insert into public.bookings (property_id, requester_name, requester_member_id, start_date, end_date, status)
       values ($1, 'Petr', $2, current_date + 11, current_date + 14, 'PENDING') returning id`,
      [ids.propA, ids.memberAMember],
    );
    return (b as { id: string }).id;
  };

  // The hold itself (PR #52 review): the member's overlapping booking is held by the trigger,
  // then the admin confirms it in the same transaction, so the trigger runs on both writes.
  it("an admin confirms a booking that the overlap rule held", async () => {
    await admin(db, "update public.properties set overlap_allowed = false where id = $1", [
      ids.propA,
    ]);
    try {
      await as(db, aMember, async (q) => {
        // Anna's seeded stay is current_date + 10 .. + 12.
        const [b] = await q<{ id: string; status: string }>(
          `insert into public.bookings (property_id, requester_name, requester_member_id, start_date, end_date, status)
           values ($1, 'Petr', $2, current_date + 11, current_date + 14, 'CONFIRMED') returning id, status`,
          [ids.propA, ids.memberAMember],
        );
        expect(b!.status).toBe("PENDING");
        // Same transaction, now as the account's admin.
        await q("reset role");
        await q("select set_config('request.jwt.claim.sub', $1, true)", [U.aAdmin]);
        await q("select set_config('request.jwt.claims', $1, true)", [
          JSON.stringify({ sub: U.aAdmin, email: EMAIL.aAdmin, role: "authenticated" }),
        ]);
        await q("set local role authenticated");
        expect(
          await q(
            "update public.bookings set status = 'CONFIRMED' where id = $1 returning status",
            [b!.id],
          ),
        ).toEqual([{ status: "CONFIRMED" }]);
      });
    } finally {
      await admin(db, "update public.properties set overlap_allowed = null where id = $1", [
        ids.propA,
      ]);
    }
  });

  it("an admin confirms or declines a member's held booking; the member withdraws their own", async () => {
    await admin(db, "update public.properties set overlap_allowed = false where id = $1", [
      ids.propA,
    ]);
    const id = await holdFixture();
    try {
      await as(db, aAdmin, async (q) => {
        expect(
          await q(
            "update public.bookings set status = 'CONFIRMED' where id = $1 returning status",
            [id],
          ),
        ).toEqual([{ status: "CONFIRMED" }]);
      });
      await as(db, aAdmin, async (q) => {
        expect(await q("delete from public.bookings where id = $1 returning id", [id])).toEqual([
          { id },
        ]);
      });
      await as(db, aMember, async (q) => {
        expect(await q("delete from public.bookings where id = $1 returning id", [id])).toEqual([
          { id },
        ]);
      });
      // Another account's admin can do neither.
      await as(db, bAdmin, async (q) => {
        expect(
          await q("update public.bookings set status = 'CONFIRMED' where id = $1 returning id", [
            id,
          ]),
        ).toEqual([]);
        expect(await q("delete from public.bookings where id = $1 returning id", [id])).toEqual([]);
      });
    } finally {
      await admin(db, "delete from public.bookings where id = $1", [id]);
      await admin(db, "update public.properties set overlap_allowed = null where id = $1", [
        ids.propA,
      ]);
    }
  });
});

describe("cross-account summaries (T-040, migration 0030)", () => {
  it("my_cottages lists the cottages of every account the caller belongs to, and no others", async () => {
    // Petr also joins B as a plain member.
    const [m] = await admin(
      db,
      "insert into public.members (account_id, name, email, role, user_id) values ($1,'Petr',$2,'MEMBER',$3) returning id",
      [ids.acctB, EMAIL.aMember, U.aMember],
    );
    try {
      await as(db, aMember, async (q) => {
        const rows = await q<{ property_id: string }>(
          "select property_id from public.my_cottages()",
        );
        expect(rows.map((r) => r.property_id).sort()).toEqual([ids.propA, ids.propB].sort());
      });
      await as(db, bAdmin, async (q) => {
        expect(await q("select property_id from public.my_cottages()")).toEqual([
          { property_id: ids.propB },
        ]);
      });
      await as(db, anon, async (q) => {
        await expect(q("select * from public.my_cottages()")).rejects.toThrow(/permission denied/);
      });
    } finally {
      await admin(db, "delete from public.members where id = $1", [(m as { id: string }).id]);
    }
  });

  it("my_invitations shows only open invitations to the caller's own email", async () => {
    await admin(
      db,
      `insert into public.invitations (account_id, role, token, email, created_by_member_id)
       values ($1,'MEMBER','t040-for-nova', $2, $4),
              ($1,'MEMBER','t040-for-bara', $3, $4)`,
      [ids.acctA, EMAIL.newcomer, EMAIL.bAdmin, ids.memberAAdmin],
    );
    await admin(
      db,
      `insert into public.invitations (account_id, role, token, email, created_by_member_id, expires_at)
       values ($1,'MEMBER','t040-expired', $2, $3, now() - interval '1 day')`,
      [ids.acctA, EMAIL.newcomer, ids.memberAAdmin],
    );
    try {
      await as(db, newcomer, async (q) => {
        // Other tests leave their own invitations for Nova; look at this test's only.
        expect(
          await q(
            "select token, account_name from public.my_invitations() where token like 't040-%'",
          ),
        ).toEqual([{ token: "t040-for-nova", account_name: "Rodina A" }]);
      });
      // Already a member of A: nothing to show. Another email: nothing either.
      await as(db, aMember, async (q) => {
        expect(await q("select token from public.my_invitations()")).toEqual([]);
      });
      await as(db, anon, async (q) => {
        await expect(q("select * from public.my_invitations()")).rejects.toThrow(
          /permission denied/,
        );
      });
    } finally {
      await admin(db, "delete from public.invitations where token like 't040-%'");
    }
  });
});

describe("auto booking approval and account names (T-042, migration 0032)", () => {
  const cyril = {
    role: "authenticated" as const,
    userId: "10000000-0000-4000-8000-0000000000e1",
    email: "cyril@example.org",
  };
  let cyrilMember = "";
  beforeAll(async () => {
    const [m] = await admin(
      db,
      "insert into public.members (account_id, name, email, role, user_id) values ($1,'Cyril',$2,'MEMBER',$3) returning id",
      [ids.acctB, cyril.email, cyril.userId],
    );
    cyrilMember = (m as { id: string }).id;
  });
  const bookInB = (
    q: <R = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<R[]>,
    member: string,
    start = 40,
  ) =>
    q<{ status: string; auto_approved: boolean }>(
      `insert into public.bookings (property_id, requester_member_id, start_date, end_date, status)
       values ($1, $2, current_date + $3::int, current_date + $3::int + 2, 'CONFIRMED')
       returning status, auto_approved`,
      [ids.propB, member, start],
    );

  it("an organisation that has not answered still holds members' bookings; Yes confirms them", async () => {
    await as(db, cyril, async (q) => {
      expect(await bookInB(q, cyrilMember)).toEqual([{ status: "PENDING", auto_approved: false }]);
    });
    await admin(db, "update public.accounts set booking_auto_approve = true where id = $1", [
      ids.acctB,
    ]);
    try {
      await as(db, cyril, async (q) => {
        expect(await bookInB(q, cyrilMember)).toEqual([
          { status: "CONFIRMED", auto_approved: true },
        ]);
      });
      // "No" holds them again.
      await admin(db, "update public.accounts set booking_auto_approve = false where id = $1", [
        ids.acctB,
      ]);
      await as(db, cyril, async (q) => {
        expect(await bookInB(q, cyrilMember)).toEqual([
          { status: "PENDING", auto_approved: false },
        ]);
      });
    } finally {
      await admin(db, "update public.accounts set booking_auto_approve = null where id = $1", [
        ids.acctB,
      ]);
    }
  });

  it("an admin's own booking is confirmed whatever the answer, and marked auto-approved", async () => {
    await admin(db, "update public.accounts set booking_auto_approve = false where id = $1", [
      ids.acctB,
    ]);
    try {
      await as(db, bAdmin, async (q) => {
        expect(await bookInB(q, ids.memberBAdmin!)).toEqual([
          { status: "CONFIRMED", auto_approved: true },
        ]);
        // Booking for someone else is the admin's decision, not an auto-approval.
        expect(await bookInB(q, cyrilMember, 50)).toEqual([
          { status: "CONFIRMED", auto_approved: false },
        ]);
      });
    } finally {
      await admin(db, "update public.accounts set booking_auto_approve = null where id = $1", [
        ids.acctB,
      ]);
    }
  });

  it("the client cannot mark a booking auto-approved, and an approval is not one", async () => {
    await as(db, cyril, async (q) => {
      const [b] = await q<{ id: string; status: string; auto_approved: boolean }>(
        `insert into public.bookings (property_id, requester_member_id, start_date, end_date, status, auto_approved)
         values ($1, $2, current_date + 60, current_date + 62, 'CONFIRMED', true)
         returning id, status, auto_approved`,
        [ids.propB, cyrilMember],
      );
      expect(b).toMatchObject({ status: "PENDING", auto_approved: false });
      expect(
        await q(
          "update public.bookings set auto_approved = true where id = $1 returning auto_approved",
          [b!.id],
        ),
      ).toEqual([{ auto_approved: false }]);
    });
  });

  it("only the organisation's admin answers, and only for an organisation", async () => {
    await as(db, cyril, async (q) => {
      await expect(
        q("select public.set_booking_auto_approve($1, true)", [ids.acctB]),
      ).rejects.toThrow(/Admin role required/);
    });
    await as(db, aAdmin, async (q) => {
      await expect(
        q("select public.set_booking_auto_approve($1, true)", [ids.acctB]),
      ).rejects.toThrow(/Admin role required/);
      await expect(
        q("select public.set_booking_auto_approve($1, true)", [ids.acctA]),
      ).rejects.toThrow(/institution_only/);
    });
    await as(db, bAdmin, async (q) => {
      await q("select public.set_booking_auto_approve($1, true)", [ids.acctB]);
      expect(
        await q("select booking_auto_approve from public.accounts where id = $1", [ids.acctB]),
      ).toEqual([{ booking_auto_approve: true }]);
    });
    await as(db, anon, async (q) => {
      await expect(
        q("select public.set_booking_auto_approve($1, true)", [ids.acctB]),
      ).rejects.toThrow(/permission denied/);
    });
  });

  it("onboarding stores the organisation's answer and refuses a family named like its cottage", async () => {
    await as(db, newcomer, async (q) => {
      await expect(
        q(
          "select public.create_account_onboarding('FAMILY', ' chata nova ', 'Chata Nova', '', null, null, '{}', null, '')",
        ),
      ).rejects.toThrow(/account_name_same_as_cottage/);
      const [r] = await q<{ id: string }>(
        "select public.create_account_onboarding(_type => 'INSTITUTIONAL', _account_name => 'Skola N', _property_name => 'Chata N', _booking_auto_approve => true) as id",
      );
      expect(
        await q(
          "select a.booking_auto_approve from public.properties p join public.accounts a on a.id = p.account_id where p.id = $1",
          [r!.id],
        ),
      ).toEqual([{ booking_auto_approve: true }]);
    });
  });

  it("only an admin renames an account, and a family not to its cottage's name", async () => {
    await as(db, aMember, async (q) => {
      await expect(
        q("select public.rename_account($1, 'Novak family')", [ids.acctA]),
      ).rejects.toThrow(/Admin role required/);
    });
    await as(db, aAdmin, async (q) => {
      await expect(q("select public.rename_account($1, 'CHATA A')", [ids.acctA])).rejects.toThrow(
        /account_name_same_as_cottage/,
      );
      await expect(q("select public.rename_account($1, 'x')", [ids.acctA])).rejects.toThrow(
        /bad_name/,
      );
      await q("select public.rename_account($1, '  Rodina Novakova ')", [ids.acctA]);
      expect(await q("select name from public.accounts where id = $1", [ids.acctA])).toEqual([
        { name: "Rodina Novakova" },
      ]);
      await expect(q("select public.rename_account($1, 'Hijack')", [ids.acctB])).rejects.toThrow(
        /Admin role required/,
      );
    });
  });

  it("guest and invitation pages learn whether the cottage is an organisation's (F-04)", async () => {
    await admin(
      db,
      "insert into public.guest_links (property_id, token) values ($1, 't042-guest-b')",
      [ids.propB],
    );
    await admin(
      db,
      "insert into public.invitations (account_id, role, token, email) values ($1,'MEMBER','t042-inv-b','x@example.org')",
      [ids.acctB],
    );
    try {
      await as(db, anon, async (q) => {
        expect(
          await q("select is_institution from public.public_guest_link('guest-token-a')"),
        ).toEqual([{ is_institution: false }]);
        expect(
          await q("select is_institution from public.public_guest_link('t042-guest-b')"),
        ).toEqual([{ is_institution: true }]);
        expect(
          await q("select state, is_institution from public.invitation_preview('t042-inv-b')"),
        ).toEqual([{ state: "valid", is_institution: true }]);
        expect(
          await q("select state, is_institution from public.invitation_preview('t042-nope')"),
        ).toEqual([{ state: "not_found", is_institution: null }]);
      });
    } finally {
      await admin(db, "delete from public.guest_links where token = 't042-guest-b'");
      await admin(db, "delete from public.invitations where token = 't042-inv-b'");
    }
  });
});

describe("booking requests from the public calendar (T-043, migration 0034)", () => {
  const visitor = {
    role: "authenticated" as const,
    userId: "10000000-0000-4000-8000-0000000000f1",
    email: "host43@example.org",
  };
  const unconfirmed = {
    role: "authenticated" as const,
    userId: "10000000-0000-4000-8000-0000000000f2",
    email: "neover@example.org",
  };
  beforeAll(async () => {
    await admin(
      db,
      "insert into auth.users (id, email, email_confirmed_at) values ($1,$2, now()), ($3,$4, null) on conflict do nothing",
      [visitor.userId, visitor.email, unconfirmed.userId, unconfirmed.email],
    );
  });

  it("anonymous callers cannot request or list", async () => {
    await as(db, anon, async (q) => {
      await expect(
        q("select public.request_public_booking($1, current_date + 5, current_date + 7, 2)", [
          ids.tokenB,
        ]),
      ).rejects.toThrow(/permission denied/);
      await expect(
        q("select * from public.my_public_booking_requests($1)", [ids.tokenB]),
      ).rejects.toThrow(/permission denied/);
    });
  });

  it("checks the link, email confirmation, membership, dates and guests", async () => {
    const ask = (
      q: (s: string, p?: unknown[]) => Promise<Record<string, unknown>[]>,
      token: string,
      s = 5,
      e = 7,
      g = 2,
    ) =>
      q(
        `select public.request_public_booking($1, current_date + ${s}, current_date + ${e}, ${g}) as r`,
        [token],
      ).then((rows) => rows[0]!["r"]);
    await as(db, unconfirmed, async (q) => {
      expect(await ask(q, ids.tokenB)).toBe("unconfirmed");
    });
    await as(db, visitor, async (q) => {
      expect(await ask(q, "nope")).toBe("link");
      // Family A's calendar is not published: same answer as a wrong link.
      expect(await ask(q, ids.tokenA)).toBe("link");
      expect(await ask(q, ids.tokenB, 7, 5)).toBe("dates");
      expect(await ask(q, ids.tokenB, -3, 2)).toBe("dates");
      expect(await ask(q, ids.tokenB, 5, 7, 0)).toBe("guests");
    });
    await as(db, bAdmin, async (q) => {
      expect(await ask(q, ids.tokenB)).toBe("member");
    });
  });

  it("a confirmed stay blocks the dates; same-day changeover does not", async () => {
    await admin(
      db,
      "insert into public.bookings (property_id, requester_name, start_date, end_date, status) values ($1,'Obsazeno', current_date + 60, current_date + 63, 'CONFIRMED')",
      [ids.propB],
    );
    try {
      await as(db, visitor, async (q) => {
        const r1 = await q(
          "select public.request_public_booking($1, current_date + 61, current_date + 62, 2) as r",
          [ids.tokenB],
        );
        expect(r1[0]!["r"]).toBe("busy");
        const r2 = await q(
          "select public.request_public_booking($1, current_date + 63, current_date + 65, 2) as r",
          [ids.tokenB],
        );
        expect(r2[0]!["r"]).toBe("ok");
      });
    } finally {
      await admin(db, "delete from public.bookings where requester_name = 'Obsazeno'");
    }
  });

  it("goes to the admins, records who decided, and the visitor sees it", async () => {
    await asCommitted(
      db,
      visitor,
      "select public.request_public_booking($1, current_date + 90, current_date + 92, 3, 'Hezky den')",
      [ids.tokenB],
    );
    try {
      const [req] = (await admin(
        db,
        "select id, status, source, guest_email, guest_link_id from public.guest_requests where requester_user_id = $1",
        [visitor.userId],
      )) as {
        id: string;
        status: string;
        source: string;
        guest_email: string;
        guest_link_id: string | null;
      }[];
      expect(req).toMatchObject({
        status: "PENDING",
        source: "public_calendar",
        guest_email: visitor.email,
        guest_link_id: null,
      });
      // Same dates again: refused as a duplicate.
      await as(db, visitor, async (q) => {
        const r = await q(
          "select public.request_public_booking($1, current_date + 90, current_date + 92, 3) as r",
          [ids.tokenB],
        );
        expect(r[0]!["r"]).toBe("duplicate");
        // The visitor can't read the table itself, only their own rows through the function.
        expect(await q("select * from public.guest_requests")).toHaveLength(0);
      });
      // Admins of the cottage see it; another account's admin doesn't.
      await as(db, aAdmin, async (q) => {
        expect(
          await q("select * from public.guest_requests where id = $1", [req!.id]),
        ).toHaveLength(0);
        await expect(q("select public.decide_guest_request($1, true)", [req!.id])).rejects.toThrow(
          /Admin/,
        );
      });
      await asCommitted(db, bAdmin, "select public.decide_guest_request($1, true)", [req!.id]);
      const [after] = (await admin(
        db,
        "select r.status, r.decided_by_member_id, r.decided_at is not null as stamped, b.approved_by_member_id, b.approved_at is not null as b_stamped, b.status as b_status from public.guest_requests r join public.bookings b on b.id = r.booking_id where r.id = $1",
        [req!.id],
      )) as Record<string, unknown>[];
      expect(after).toEqual({
        status: "APPROVED",
        decided_by_member_id: ids.memberBAdmin,
        stamped: true,
        approved_by_member_id: ids.memberBAdmin,
        b_stamped: true,
        b_status: "CONFIRMED",
      });
      await as(db, visitor, async (q) => {
        const mine = await q<{ status: string; decided_by_name: string }>(
          "select status, decided_by_name from public.my_public_booking_requests($1)",
          [ids.tokenB],
        );
        expect(mine[0]).toEqual({ status: "APPROVED", decided_by_name: "Bara" });
      });
      await as(db, newcomer, async (q) => {
        expect(
          await q("select * from public.my_public_booking_requests($1)", [ids.tokenB]),
        ).toHaveLength(0);
      });
    } finally {
      await admin(
        db,
        "delete from public.bookings where id in (select booking_id from public.guest_requests where requester_user_id = $1)",
        [visitor.userId],
      );
      await admin(db, "delete from public.guest_requests where requester_user_id = $1", [
        visitor.userId,
      ]);
    }
  });

  it("nobody can write approved_by themselves; approving a held stay stamps the admin", async () => {
    await as(db, aAdmin, async (q) => {
      const [b] = await q<{ id: string; approved_by_member_id: string | null }>(
        "insert into public.bookings (property_id, requester_name, requester_member_id, start_date, end_date, status, approved_by_member_id) values ($1,'Petr',$2, current_date + 120, current_date + 122, 'PENDING', $3) returning id, approved_by_member_id",
        [ids.propA, ids.memberAMember, ids.memberAMember],
      );
      expect(b!.approved_by_member_id).toBeNull();
      const [c] = await q<{ approved_by_member_id: string | null }>(
        "update public.bookings set status = 'CONFIRMED' where id = $1 returning approved_by_member_id",
        [b!.id],
      );
      expect(c!.approved_by_member_id).toBe(ids.memberAAdmin);
      const [d] = await q<{ approved_by_member_id: string | null }>(
        "update public.bookings set approved_by_member_id = $2, note = 'x' where id = $1 returning approved_by_member_id",
        [b!.id, ids.memberAMember],
      );
      expect(d!.approved_by_member_id).toBe(ids.memberAAdmin);
    });
  });

  it("a member can't name themselves approver of a booking confirmed in one step (PR #66 review)", async () => {
    await as(db, aMember, async (q) => {
      const [b] = await q<{
        status: string;
        approved_by_member_id: string | null;
        approved_at: string | null;
      }>(
        "insert into public.bookings (property_id, requester_name, requester_member_id, start_date, end_date, status, approved_by_member_id) values ($1,'Petr',$2, current_date + 140, current_date + 141, 'CONFIRMED', $2) returning status, approved_by_member_id, approved_at",
        [ids.propA, ids.memberAMember],
      );
      expect(b!.approved_by_member_id).toBeNull();
      expect(b!.approved_at).toBeNull();
    });
  });

  it("approving re-checks the dates (PR #66 review)", async () => {
    const r = await admin(
      db,
      "insert into public.guest_requests (property_id, guest_name, start_date, end_date, guests, source) values ($1,'Pozdě', current_date + 200, current_date + 202, 2, 'public_calendar') returning id",
      [ids.propB],
    );
    const reqId = (r[0] as { id: string }).id;
    await admin(
      db,
      "insert into public.bookings (property_id, requester_name, start_date, end_date, status) values ($1,'Dřív', current_date + 201, current_date + 203, 'CONFIRMED')",
      [ids.propB],
    );
    try {
      await as(db, bAdmin, async (q) => {
        await expect(q("select public.decide_guest_request($1, true)", [reqId])).rejects.toThrow(
          /dates_taken/,
        );
        await q("select public.decide_guest_request($1, false)", [reqId]);
      });
    } finally {
      await admin(db, "delete from public.bookings where requester_name = 'Dřív'");
      await admin(db, "delete from public.guest_requests where id = $1", [reqId]);
    }
  });

  it("only admins read guest requests (visitor e-mails); a switched-off form says so", async () => {
    const r = await admin(
      db,
      "insert into public.guest_requests (guest_link_id, property_id, guest_name, guest_email, start_date, end_date, guests) values ($1,$2,'Host E','host-e@example.org', current_date + 50, current_date + 51, 1) returning id",
      [ids.guestLinkA, ids.propA],
    );
    const reqId = (r[0] as { id: string }).id;
    try {
      await as(db, aMember, async (q) => {
        expect(await q("select * from public.guest_requests where id = $1", [reqId])).toHaveLength(
          0,
        );
      });
      await as(db, aAdmin, async (q) => {
        expect(await q("select * from public.guest_requests where id = $1", [reqId])).toHaveLength(
          1,
        );
      });
      await admin(
        db,
        "update public.feature_flags set enabled = false where key = 'guest_requests'",
      );
      await as(db, visitor, async (q) => {
        const x = await q(
          "select public.request_public_booking($1, current_date + 5, current_date + 7, 2) as r",
          [ids.tokenB],
        );
        expect(x[0]!["r"]).toBe("disabled");
      });
    } finally {
      await admin(
        db,
        "update public.feature_flags set enabled = true where key = 'guest_requests'",
      );
      await admin(db, "delete from public.guest_requests where id = $1", [reqId]);
    }
  });
});

describe("owner, account type changes, institution requests (T-045, migration 0036)", () => {
  const dana = {
    role: "authenticated" as const,
    userId: "10000000-0000-4000-8000-0000000000f1",
    email: "dana@example.org",
  };
  let danaMember = "";
  beforeAll(async () => {
    const [m] = await admin(
      db,
      "insert into public.members (account_id, name, email, role, user_id) values ($1,'Dana',$2,'MEMBER',$3) returning id",
      [ids.acctB, dana.email, dana.userId],
    );
    danaMember = (m as { id: string }).id;
  });

  it("every account has exactly one owner: the founding admin (D-22)", async () => {
    expect(
      await admin(db, "select role from public.members where id = $1", [ids.memberAAdmin]),
    ).toEqual([{ role: "OWNER" }]);
    expect(
      await admin(db, "select role from public.members where id = $1", [ids.memberBAdmin]),
    ).toEqual([{ role: "OWNER" }]);
    // A second OWNER row, by INSERT or UPDATE, is stored as ADMIN.
    const [x] = await admin(
      db,
      "insert into public.members (account_id, name, email, role, user_id) values ($1,'Druhý','druhy@example.org','OWNER', null) returning id, role",
      [ids.acctA],
    );
    try {
      expect((x as { role: string }).role).toBe("ADMIN");
      expect(
        await admin(db, "update public.members set role = 'OWNER' where id = $1 returning role", [
          (x as { id: string }).id,
        ]),
      ).toEqual([{ role: "ADMIN" }]);
    } finally {
      await admin(db, "delete from public.members where id = $1", [(x as { id: string }).id]);
    }
  });

  it("an account whose owner row is gone gets the next admin with a sign-in as owner", async () => {
    await as(db, aAdmin, async (q) => {
      await q("reset role");
      // The owner's sign-in is deleted (members.user_id is set null): the row stops being owner.
      await q("update public.members set user_id = null where id = $1", [ids.memberAAdmin]);
      expect(await q("select role from public.members where id = $1", [ids.memberAAdmin])).toEqual([
        { role: "ADMIN" },
      ]);
      await q("update public.members set role = 'ADMIN' where id = $1", [ids.memberAMember]);
      expect(await q("select role from public.members where id = $1", [ids.memberAMember])).toEqual(
        [{ role: "OWNER" }],
      );
    });
  });

  it("ownership moves only when the person offered accepts; then the old owner may leave", async () => {
    const become = (
      q: (sql: string, p?: unknown[]) => Promise<unknown[]>,
      userId: string,
      email: string,
    ) =>
      q(
        "select set_config('request.jwt.claim.sub', $1, true), set_config('request.jwt.claims', $2, true)",
        [userId, JSON.stringify({ sub: userId, email, role: "authenticated" })],
      );
    await as(db, aAdmin, async (q) => {
      // Only the owner offers; the offer changes nothing until it is accepted.
      const [o] = await q<{ id: string }>("select public.offer_account_ownership($1, $2) as id", [
        ids.acctA,
        ids.memberAMember,
      ]);
      expect(await q("select role from public.members where id = $1", [ids.memberAAdmin])).toEqual([
        { role: "OWNER" },
      ]);
      // The owner can't leave while they own the account.
      await expect(q("select public.leave_account($1)", [ids.acctA])).rejects.toThrow(
        /owner_must_transfer/,
      );
      // Nobody but the person offered can accept.
      await become(q, U.bAdmin, EMAIL.bAdmin);
      await expect(q("select public.respond_account_ownership($1, true)", [o!.id])).rejects.toThrow(
        /not_your_offer/,
      );
      // The person offered sees it and accepts.
      await become(q, U.aMember, EMAIL.aMember);
      expect(await q("select account_name from public.my_ownership_offers()")).toHaveLength(1);
      await q("select public.respond_account_ownership($1, true)", [o!.id]);
      expect(
        await q("select id, role from public.members where account_id = $1", [ids.acctA]),
      ).toEqual(
        expect.arrayContaining([
          { id: ids.memberAAdmin, role: "ADMIN" },
          { id: ids.memberAMember, role: "OWNER" },
        ]),
      );
      await expect(q("select public.respond_account_ownership($1, true)", [o!.id])).rejects.toThrow(
        /offer_closed/,
      );
      // The former owner is an admin now: no more offers, but they may leave.
      await become(q, U.aAdmin, EMAIL.aAdmin);
      await expect(
        q("select public.offer_account_ownership($1, $2)", [ids.acctA, ids.memberAAdmin]),
      ).rejects.toThrow(/owner_required/);
    });
    await as(db, bAdmin, async (q) => {
      await expect(
        q("select public.offer_account_ownership($1, $2)", [ids.acctA, ids.memberBAdmin]),
      ).rejects.toThrow(/owner_required/);
    });
    await as(db, anon, async (q) => {
      await expect(
        q("select public.offer_account_ownership($1, $2)", [ids.acctA, ids.memberAMember]),
      ).rejects.toThrow(/permission denied/);
      await expect(q("select * from public.ownership_offers")).rejects.toThrow(/permission denied/);
    });
  });

  it("a member leaves: open debts first; then no sign-in, no e-mail, no admin rows", async () => {
    await as(db, aMember, async (q) => {
      await q("reset role");
      const [e] = await q<{ id: string }>(
        "insert into public.expenses (property_id, amount, category, split_method, paid_by_member_id, description) values ($1, 100, 'other', 'EQUAL', $2, 'Pivo') returning id",
        [ids.propA, ids.memberAAdmin],
      );
      await q(
        "insert into public.expense_splits (expense_id, member_id, amount_owed, paid_back) values ($1, $2, 50, false)",
        [e!.id, ids.memberAMember],
      );
      await q("set local role authenticated");
      await expect(q("select public.leave_account($1)", [ids.acctA])).rejects.toThrow(/open_debts/);
      await q("reset role");
      // Settle everything they owe or are owed (earlier tests leave more).
      await q(
        "update public.expense_splits s set paid_back = true from public.expenses e where e.id = s.expense_id and (s.member_id = $1 or e.paid_by_member_id = $1)",
        [ids.memberAMember],
      );
      const [task] = await q<{ id: string }>(
        "insert into public.tasks (property_id, title, assignee_member_id) values ($1, 'Okapy', $2) returning id",
        [ids.propA, ids.memberAMember],
      );
      await q("set local role authenticated");
      await q("select public.leave_account($1)", [ids.acctA]);
      await q("reset role");
      // Their open tasks go back to nobody.
      expect(
        await q("select assignee_member_id from public.tasks where id = $1", [task!.id]),
      ).toEqual([{ assignee_member_id: null }]);
      await q("set local role authenticated");
      await q("reset role");
      expect(
        await q("select user_id, email, role from public.members where id = $1", [
          ids.memberAMember,
        ]),
      ).toEqual([{ user_id: null, email: "", role: "MEMBER" }]);
      expect(
        (
          await q<{ left: boolean }>(
            "select left_at is not null as left from public.members where id = $1",
            [ids.memberAMember],
          )
        )[0]?.left,
      ).toBe(true);
      expect(
        await q(
          "select action from public.audit_log where action = 'member_left' and target_id = $1",
          [ids.memberAMember],
        ),
      ).toHaveLength(1);
      // Signing in again doesn't re-claim the row by e-mail.
      await q("set local role authenticated");
      await q("select public.claim_initial_membership()");
      await q("reset role");
      expect(
        await q("select user_id from public.members where id = $1", [ids.memberAMember]),
      ).toEqual([{ user_id: null }]);
    });
  });

  it("the owner changes the account type at most once in six months, both ways (D-03)", async () => {
    await admin(db, "update public.members set role = 'ADMIN' where id = $1", [ids.memberAMember]);
    try {
      await as(db, aMember, async (q) => {
        await expect(
          q("select public.change_account_type($1, 'INSTITUTIONAL', 'Spolek A')", [ids.acctA]),
        ).rejects.toThrow(/owner_required/);
      });
    } finally {
      await admin(db, "update public.members set role = 'MEMBER' where id = $1", [
        ids.memberAMember,
      ]);
    }
    await as(db, aAdmin, async (q) => {
      await q("select public.change_account_type($1, 'INSTITUTIONAL', 'Spolek A')", [ids.acctA]);
      const [after] = await q<{ d: string | null }>(
        "select public.account_type_change_after($1)::date::text as d",
        [ids.acctA],
      );
      expect(after?.d).toBeTruthy();
      await expect(
        q("select public.change_account_type($1, 'FAMILY', 'Rodina A')", [ids.acctA]),
      ).rejects.toThrow(/type_change_cooldown/);
      // Seven months later the owner may switch back, but not to the cottage's own name.
      await q("reset role");
      await q(
        "update public.accounts set type_changed_at = now() - interval '7 months' where id = $1",
        [ids.acctA],
      );
      await q("set local role authenticated");
      await expect(
        q("select public.change_account_type($1, 'FAMILY', 'Chata A')", [ids.acctA]),
      ).rejects.toThrow(/account_name_same_as_cottage/);
      await q("select public.change_account_type($1, 'FAMILY', 'Rodina A')", [ids.acctA]);
      expect(await q("select type from public.accounts where id = $1", [ids.acctA])).toEqual([
        { type: "FAMILY" },
      ]);
      await expect(
        q("select public.change_account_type($1, 'FAMILY')", [ids.acctA]),
      ).rejects.toThrow(/same_type/);
    });
  });

  it("an organisation with open stay requests decides them before becoming a family", async () => {
    await as(db, bAdmin, async (q) => {
      await q("reset role");
      await q(
        "insert into public.institutional_requests (property_id, requester_name, requester_email, start_date, end_date, guests, status) values ($1,'Čeká','ceka@example.org', current_date + 70, current_date + 71, 1, 'PENDING')",
        [ids.propB],
      );
      await q("set local role authenticated");
      await expect(
        q("select public.change_account_type($1, 'FAMILY', 'Rodina B')", [ids.acctB]),
      ).rejects.toThrow(/pending_requests/);
    });
  });

  it("settling between two people clears both directions and leaves an audit row (25 Oct check)", async () => {
    await as(db, aAdmin, async (q) => {
      await q("reset role");
      // aMember paid 8 000 for aAdmin (4 000 each); aAdmin paid 1 000 for aMember (333,34).
      const [e1] = await q<{ id: string }>(
        "insert into public.expenses (property_id, amount, category, split_method, paid_by_member_id, description) values ($1, 8000, 'other', 'EQUAL', $2, 'G') returning id",
        [ids.propA, ids.memberAMember],
      );
      const [e2] = await q<{ id: string }>(
        "insert into public.expenses (property_id, amount, category, split_method, paid_by_member_id, description) values ($1, 1000, 'supplies', 'EQUAL', $2, 'Fridge') returning id",
        [ids.propA, ids.memberAAdmin],
      );
      await q(
        "insert into public.expense_splits (expense_id, member_id, amount_owed, paid_back) values ($1, $2, 4000, false), ($3, $4, 333.34, false)",
        [e1!.id, ids.memberAAdmin, e2!.id, ids.memberAMember],
      );
      await q("set local role authenticated");
      // aAdmin owes the net 3 666,66 to aMember; as an admin they confirm for the receiver.
      const [r] = await q<{ n: number }>("select public.settle_debt($1,$2,$3) as n", [
        ids.propA,
        ids.memberAAdmin,
        ids.memberAMember,
      ]);
      // Earlier tests leave one more open share between the two: every one of them is cleared.
      expect(r?.n).toBeGreaterThanOrEqual(2);
      expect(
        await q(
          "select count(*)::int as open from public.expense_splits where expense_id in ($1,$2) and not paid_back",
          [e1!.id, e2!.id],
        ),
      ).toEqual([{ open: 0 }]);
      await q("reset role");
      const log = await q<{ detail: { shares: number } }>(
        "select detail from public.audit_log where action = 'debt_settled' and target_id = $1",
        [ids.propA],
      );
      expect(log.at(-1)?.detail.shares).toBe(r?.n);
    });
  });

  it("a running paid plan is changed through billing, not here", async () => {
    await as(db, aAdmin, async (q) => {
      await q("reset role");
      await q("update public.plans set price_czk_month = 99 where id = 'family_plus'");
      await q(
        "insert into public.subscriptions (account_id, plan_id, status) values ($1, 'family_plus', 'active')",
        [ids.acctA],
      );
      await q("set local role authenticated");
      await expect(
        q("select public.change_account_type($1, 'INSTITUTIONAL', 'Spolek A')", [ids.acctA]),
      ).rejects.toThrow(/billing_change_required/);
    });
  });

  it("only admins read and decide institution stay requests (D-16)", async () => {
    const r = await admin(
      db,
      "insert into public.institutional_requests (property_id, requester_name, requester_email, start_date, end_date, guests, status) values ($1,'Žadatel','zadatel@example.org', current_date + 60, current_date + 61, 1, 'PENDING') returning id",
      [ids.propB],
    );
    const reqId = (r[0] as { id: string }).id;
    try {
      await as(db, dana, async (q) => {
        expect(
          await q("select * from public.institutional_requests where id = $1", [reqId]),
        ).toHaveLength(0);
        expect(
          await q(
            "update public.institutional_requests set status = 'APPROVED' where id = $1 returning id",
            [reqId],
          ),
        ).toHaveLength(0);
      });
      await as(db, bAdmin, async (q) => {
        expect(
          await q(
            "update public.institutional_requests set status = 'APPROVED' where id = $1 returning id",
            [reqId],
          ),
        ).toHaveLength(1);
      });
      expect(danaMember).toBeTruthy();
    } finally {
      await admin(db, "delete from public.institutional_requests where id = $1", [reqId]);
    }
  });
});

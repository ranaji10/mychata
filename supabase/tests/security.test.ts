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
  it("an admin promotes and demotes, but never removes the last admin", async () => {
    await as(db, aAdmin, async (q) => {
      await q("select public.set_member_role($1,'ADMIN')", [ids.memberAMember]);
      await q("select public.set_member_role($1,'MEMBER')", [ids.memberAMember]);
      await expect(
        q("select public.set_member_role($1,'MEMBER')", [ids.memberAAdmin]),
      ).rejects.toThrow(/last_admin/);
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

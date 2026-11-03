/**
 * T-057 (migration 0040) RLS audit: who can do what with payment_claims, the claim functions,
 * the closing trigger, email_lang, preferred_lang and the new cottage facts, for anon, a member
 * and an admin of the same account, a member of another account and a member who left.
 *
 * The three gaps the audit found (claim toward a member who left, an admin confirming their own
 * claim, confirming debts added after the claim) are fixed in 0040; their tests prove it.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { admin, as, asCommitted, freshDb, type Db } from "./harness";

const U = {
  owner: "57200000-0000-4000-8000-00000000000a",
  adm: "57200000-0000-4000-8000-00000000000b",
  petr: "57200000-0000-4000-8000-00000000000c",
  jana: "57200000-0000-4000-8000-00000000000d",
  lea: "57200000-0000-4000-8000-00000000000e",
  other: "57200000-0000-4000-8000-00000000000f",
};
type Who = keyof typeof U;
const who = (k: Who) => ({
  role: "authenticated" as const,
  userId: U[k],
  email: `${k}@example.org`,
});
const anon = { role: "anon" as const };
type Q = <R = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<R[]>;

let db: Db;
const ids: Record<string, string> = {};

async function val<T>(sql: string, params?: unknown[]): Promise<T> {
  const rows = (await admin(db, sql, params)) as Record<string, unknown>[];
  return Object.values(rows[0] ?? {})[0] as T;
}
/** Switch the signed-in user inside one rolled-back transaction (role stays authenticated). */
async function become(q: Q, k: Who) {
  await q("select set_config('request.jwt.claim.sub', $1, true)", [U[k]]);
  await q("select set_config('request.jwt.claims', $1, true)", [
    JSON.stringify({ sub: U[k], email: `${k}@example.org`, role: "authenticated" }),
  ]);
}
async function expense(prop: string, payer: string, amount: number, debtor: string) {
  const e = await val<string>(
    "insert into public.expenses (property_id, amount, category, description, paid_by_member_id) values ($1,$2,'supplies','x',$3) returning id",
    [prop, amount, payer],
  );
  await admin(
    db,
    "insert into public.expense_splits (expense_id, member_id, amount_owed) values ($1,$2,$3)",
    [e, debtor, amount],
  );
  return e;
}

beforeAll(async () => {
  db = await freshDb();
  for (const [k, id] of Object.entries(U)) {
    await admin(
      db,
      "insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values ($1,$2,now(),'{}')",
      [id, `${k}@example.org`],
    );
  }
  await asCommitted(
    db,
    who("owner"),
    "select public.create_account_onboarding(_type => 'FAMILY', _account_name => 'Rodina R', _property_name => 'Chata R', _capacity => 4)",
  );
  ids.acct = await val("select account_id from public.members where user_id = $1", [U.owner]);
  ids.prop = await val("select id from public.properties where account_id = $1", [ids.acct]);
  ids.owner = await val("select id from public.members where user_id = $1", [U.owner]);
  ids.prop2 = await val(
    "insert into public.properties (account_id, name, address) values ($1,'Chata R2','') returning id",
    [ids.acct],
  );
  for (const [k, role] of [
    ["adm", "ADMIN"],
    ["petr", "MEMBER"],
    ["jana", "MEMBER"],
    ["lea", "ADMIN"],
  ] as const) {
    ids[k] = await val(
      "insert into public.members (account_id, name, email, role, user_id) values ($1,$2,$3,$4,$5) returning id",
      [ids.acct, k, `${k}@example.org`, role, U[k]],
    );
  }
  // Lea (an admin) leaves through the real function: user_id null, role MEMBER, left_at set.
  await asCommitted(db, who("lea"), "select public.leave_account($1)", [ids.acct]);

  ids.otherAcct = await val(
    "insert into public.accounts (type, name) values ('FAMILY','Cizi') returning id",
  );
  ids.other = await val(
    "insert into public.members (account_id, name, email, role, user_id) values ($1,'Cizi Admin','other@example.org','ADMIN',$2) returning id",
    [ids.otherAcct, U.other],
  );
  ids.otherM2 = await val(
    "insert into public.members (account_id, name, email, role) values ($1,'Cizi Clen','m2@example.org','MEMBER') returning id",
    [ids.otherAcct],
  );
  ids.propX = await val(
    "insert into public.properties (account_id, name, address) values ($1,'Cizi chata','') returning id",
    [ids.otherAcct],
  );

  ids.e1 = await expense(ids.prop, ids.owner, 300, ids.petr); // Petr owes owner 300
  ids.e2 = await expense(ids.prop, ids.jana, 200, ids.petr); // Petr owes Jana 200
  ids.e3 = await expense(ids.prop, ids.jana, 100, ids.owner); // owner (admin) owes Jana 100
  ids.e4 = await expense(ids.prop2, ids.owner, 50, ids.petr); // second cottage, same account
  ids.eLea = await expense(ids.prop, ids.lea, 150, ids.petr); // Petr owes Lea, who left
  ids.eX = await expense(ids.propX, ids.other, 70, ids.otherM2); // another account

  // A pending claim in the other account, to prove it is invisible from here.
  await admin(
    db,
    "insert into public.payment_claims (account_id, property_id, from_member_id, to_member_id, amount) values ($1,$2,$3,$4,70)",
    [ids.otherAcct, ids.propX, ids.otherM2, ids.other],
  );
});

describe("payment_claims table: direct access", () => {
  it("anon has no privilege at all", async () => {
    await as(db, anon, async (q) => {
      for (const sql of [
        "select * from public.payment_claims",
        "delete from public.payment_claims",
        "update public.payment_claims set status = 'CONFIRMED'",
      ]) {
        await expect(q(sql)).rejects.toThrow(/permission denied/);
      }
    });
  });
  it("members and admins read their account's claims only and cannot insert/update/delete", async () => {
    for (const k of ["petr", "owner", "other", "lea"] as const) {
      await as(db, who(k), async (q) => {
        await q("select public.claim_payment($1,$2)", [ids.prop, ids.owner]).catch(() => null);
        const rows = await q<{ account_id: string }>(
          "select account_id from public.payment_claims",
        );
        const mine = k === "other" ? ids.otherAcct : ids.acct;
        if (k === "lea") expect(rows).toHaveLength(0);
        else expect(rows.every((r) => r.account_id === mine)).toBe(true);
        if (k === "other") expect(rows).toHaveLength(1);
        await expect(q("delete from public.payment_claims")).rejects.toThrow(/permission denied/);
        await expect(q("update public.payment_claims set amount = 1")).rejects.toThrow(
          /permission denied/,
        );
        await expect(
          q(
            "insert into public.payment_claims (account_id, property_id, from_member_id, to_member_id, amount) values ($1,$2,$3,$4,1)",
            [ids.acct, ids.prop, ids.petr, ids.owner],
          ),
        ).rejects.toThrow(/permission denied/);
      });
    }
  });
});

describe("claim_payment", () => {
  it("anon cannot execute", async () => {
    await as(db, anon, async (q) => {
      await expect(q("select public.claim_payment($1,$2)", [ids.prop, ids.owner])).rejects.toThrow(
        /permission denied/,
      );
    });
  });
  it("the amount is computed server-side: there is no amount parameter", async () => {
    await as(db, who("petr"), async (q) => {
      await expect(
        q("select public.claim_payment($1,$2,null,1)", [ids.prop, ids.owner]),
      ).rejects.toThrow(/does not exist/);
      const [r] = await q<{ id: string }>("select public.claim_payment($1,$2) as id", [
        ids.prop,
        ids.owner,
      ]);
      expect(
        (
          await q<{ a: string }>("select amount::text a from public.payment_claims where id=$1", [
            r!.id,
          ])
        )[0]!.a,
      ).toBe("300");
    });
  });
  it("cannot claim toward another account's member, from another account, or as a member who left", async () => {
    await as(db, who("petr"), async (q) => {
      await expect(q("select public.claim_payment($1,$2)", [ids.prop, ids.other])).rejects.toThrow(
        /member_not_in_account/,
      );
      await expect(q("select public.claim_payment($1,$2)", [ids.propX, ids.other])).rejects.toThrow(
        /not_a_member/,
      );
      await expect(q("select public.claim_payment($1,$2)", [ids.prop, ids.petr])).rejects.toThrow(
        /member_not_in_account/,
      );
    });
    await as(db, who("other"), async (q) => {
      await expect(q("select public.claim_payment($1,$2)", [ids.prop, ids.owner])).rejects.toThrow(
        /not_a_member/,
      );
    });
    await as(db, who("lea"), async (q) => {
      await expect(q("select public.claim_payment($1,$2)", [ids.prop, ids.owner])).rejects.toThrow(
        /not_a_member/,
      );
    });
    expect(
      await val("select count(*)::int from public.notifications where kind = 'payment_claimed'"),
    ).toBe(0);
  });
  it("a per-expense claim must name an expense of this cottage, paid by the payee, owed by the caller", async () => {
    await as(db, who("petr"), async (q) => {
      // Expense at another cottage of the same account.
      await expect(
        q("select public.claim_payment($1,$2,$3)", [ids.prop, ids.owner, ids.e4]),
      ).rejects.toThrow(/nothing_owed/);
      // Expense in another account.
      await expect(
        q("select public.claim_payment($1,$2,$3)", [ids.prop, ids.owner, ids.eX]),
      ).rejects.toThrow(/nothing_owed/);
      // Expense paid by someone other than the payee.
      await expect(
        q("select public.claim_payment($1,$2,$3)", [ids.prop, ids.owner, ids.e2]),
      ).rejects.toThrow(/nothing_owed/);
    });
    // Expense the caller does not owe on.
    await as(db, who("adm"), async (q) => {
      await expect(
        q("select public.claim_payment($1,$2,$3)", [ids.prop, ids.owner, ids.e1]),
      ).rejects.toThrow(/nothing_owed/);
    });
  });
  it("refuses a claim toward a member who left (remind_debt does)", async () => {
    await as(db, who("petr"), async (q) => {
      await expect(q("select public.claim_payment($1,$2)", [ids.prop, ids.lea])).rejects.toThrow(
        /member_not_in_account/,
      );
    });
  });
  it("the notification goes only to the payee in the same account", async () => {
    await as(db, who("petr"), async (q) => {
      await q("select public.claim_payment($1,$2)", [ids.prop, ids.owner]);
      // notifications has no direct grant to authenticated; inspect as the owner role.
      await q("reset role");
      const n = await q<{
        account_id: string;
        recipient_member_id: string;
        payload: Record<string, unknown>;
      }>(
        "select account_id, recipient_member_id, payload from public.notifications where kind = 'payment_claimed'",
      );
      expect(n).toHaveLength(1);
      expect(n[0]!.account_id).toBe(ids.acct);
      expect(n[0]!.recipient_member_id).toBe(ids.owner);
      expect(n[0]!.payload.from_name).toBe("petr");
    });
  });
});

describe("decide_payment_claim", () => {
  async function petrClaims(q: Q, to: string, exp: string | null = null) {
    await become(q, "petr");
    const [r] = await q<{ id: string }>("select public.claim_payment($1,$2,$3) as id", [
      ids.prop,
      to,
      exp,
    ]);
    return r!.id;
  }
  it("anon, another account, a member who left, the payer and a bystander member cannot decide", async () => {
    await as(db, who("petr"), async (q) => {
      const c = await petrClaims(q, ids.owner);
      await expect(q("select public.decide_payment_claim($1,true)", [c])).rejects.toThrow(
        /only_receiver_confirms/,
      );
      for (const [k, err] of [
        ["jana", /only_receiver_confirms/],
        ["other", /not_a_member/],
        ["lea", /not_a_member/],
      ] as const) {
        await become(q, k);
        await expect(q("select public.decide_payment_claim($1,true)", [c])).rejects.toThrow(err);
      }
      await become(q, "owner");
      expect(
        (await q<{ s: string }>("select status s from public.payment_claims where id=$1", [c]))[0]!
          .s,
      ).toBe("PENDING");
    });
    await as(db, anon, async (q) => {
      await expect(
        q("select public.decide_payment_claim(gen_random_uuid(), true)"),
      ).rejects.toThrow(/permission denied/);
    });
  });
  it("another admin of the same account may decide (by design, same as settle_debt)", async () => {
    await as(db, who("petr"), async (q) => {
      const c = await petrClaims(q, ids.jana, ids.e2);
      await become(q, "adm");
      expect(
        (await q<{ r: string }>("select public.decide_payment_claim($1,false) r", [c]))[0]!.r,
      ).toBe("REJECTED");
    });
  });
  it("a confirmed per-expense claim marks only that share", async () => {
    await as(db, who("petr"), async (q) => {
      const c = await petrClaims(q, ids.jana, ids.e2);
      await become(q, "jana");
      await q("select public.decide_payment_claim($1,true)", [c]);
      const rows = await q<{ expense_id: string; paid_back: boolean }>(
        "select expense_id, paid_back from public.expense_splits where member_id = $1",
        [ids.petr],
      );
      for (const r of rows) expect(r.paid_back).toBe(r.expense_id === ids.e2);
    });
  });
  it("an admin cannot confirm a claim where they are the payer", async () => {
    await as(db, who("owner"), async (q) => {
      const [r] = await q<{ id: string }>("select public.claim_payment($1,$2) as id", [
        ids.prop,
        ids.jana,
      ]);
      await expect(q("select public.decide_payment_claim($1,true)", [r!.id])).rejects.toThrow();
    });
  });
  it("confirming settles only what was claimed, not debts added later", async () => {
    await as(db, who("petr"), async (q) => {
      const c = await petrClaims(q, ids.owner); // claims 300
      await become(q, "owner");
      const [e] = await q<{ id: string }>(
        "insert into public.expenses (property_id, amount, category, description, paid_by_member_id) values ($1,5000,'repairs','Strecha',$2) returning id",
        [ids.prop, ids.owner],
      );
      await q(
        "insert into public.expense_splits (expense_id, member_id, amount_owed) values ($1,$2,5000)",
        [e!.id, ids.petr],
      );
      await q("select public.decide_payment_claim($1,true)", [c]);
      const [s] = await q<{ paid_back: boolean }>(
        "select paid_back from public.expense_splits where expense_id = $1",
        [e!.id],
      );
      expect(s!.paid_back).toBe(false);
    });
  });
});

describe("close_settled_claims trigger", () => {
  it("cannot be called directly", async () => {
    for (const w of [anon, who("owner")]) {
      await as(db, w, async (q) => {
        await expect(q("select public.close_settled_claims()")).rejects.toThrow();
      });
    }
  });
  it("the debtor cannot mark their own share paid, so cannot auto-close their claim", async () => {
    await as(db, who("petr"), async (q) => {
      const [r] = await q<{ id: string }>("select public.claim_payment($1,$2,$3) as id", [
        ids.prop,
        ids.owner,
        ids.e1,
      ]);
      const upd = await q(
        "update public.expense_splits set paid_back = true where expense_id = $1 returning 1",
        [ids.e1],
      );
      expect(upd).toHaveLength(0);
      expect(
        (
          await q<{ s: string }>("select status s from public.payment_claims where id=$1", [r!.id])
        )[0]!.s,
      ).toBe("PENDING");
    });
  });
  it("paying another pair's or another cottage's share leaves the claim open", async () => {
    await as(db, who("petr"), async (q) => {
      const [r] = await q<{ id: string }>("select public.claim_payment($1,$2) as id", [
        ids.prop,
        ids.owner,
      ]);
      await become(q, "jana");
      await q("update public.expense_splits set paid_back = true where expense_id = $1", [ids.e2]);
      await become(q, "owner");
      await q("update public.expense_splits set paid_back = true where expense_id = $1", [ids.e4]);
      expect(
        (
          await q<{ s: string }>("select status s from public.payment_claims where id=$1", [r!.id])
        )[0]!.s,
      ).toBe("PENDING");
    });
    // Another account's claim is untouched by anything here.
    expect(
      await val("select status from public.payment_claims where account_id = $1", [ids.otherAcct]),
    ).toBe("PENDING");
  });
});

describe("email_lang, notify_enqueue", () => {
  it("authenticated and anon cannot execute either", async () => {
    for (const w of [anon, who("owner"), who("other")]) {
      await as(db, w, async (q) => {
        await expect(q("select public.email_lang('petr@example.org')")).rejects.toThrow(
          /permission denied/,
        );
        await expect(
          q("select public.notify_enqueue($1,'payment_claimed',$2,null,null,'{}'::jsonb,'x')", [
            ids.acct,
            ids.owner,
          ]),
        ).rejects.toThrow(/permission denied/);
      });
    }
  });
});

describe("profiles.preferred_lang", () => {
  it("a user cannot write another user's language; anon cannot write any", async () => {
    await admin(
      db,
      "insert into public.profiles (user_id, preferred_lang) values ($1,'cs') on conflict (user_id) do update set preferred_lang='cs'",
      [U.jana],
    );
    for (const k of ["petr", "owner", "other"] as const) {
      await as(db, who(k), async (q) => {
        const r = await q(
          "update public.profiles set preferred_lang = 'en' where user_id = $1 returning 1",
          [U.jana],
        );
        expect(r).toHaveLength(0);
      });
    }
    await as(db, who("petr"), async (q) => {
      await expect(
        q("insert into public.profiles (user_id, preferred_lang) values ($1,'en')", [U.lea]),
      ).rejects.toThrow(/row-level security/);
    });
    await as(db, anon, async (q) => {
      await expect(
        q("update public.profiles set preferred_lang = 'en' where user_id = $1", [U.jana]),
      ).rejects.toThrow(/permission denied/);
    });
    expect(
      await val("select preferred_lang from public.profiles where user_id = $1", [U.jana]),
    ).toBe("cs");
  });
});

describe("cottage facts", () => {
  it("only a current admin of the account changes them; nobody writes the columns directly", async () => {
    for (const [w, err] of [
      [anon, /permission denied/],
      [who("petr"), /Admin role required/],
      [who("other"), /Admin role required/],
      [who("lea"), /Admin role required/],
    ] as const) {
      await as(db, w, async (q) => {
        await expect(
          q("select public.update_property_details(_property_id => $1, _capacity => 9)", [
            ids.prop,
          ]),
        ).rejects.toThrow(err);
      });
    }
    await as(db, who("adm"), async (q) => {
      await q("select public.update_property_details(_property_id => $1, _beds => 7)", [ids.prop]);
      const r = await q(
        "update public.properties set capacity = 99, pets_allowed = true where id = $1 returning 1",
        [ids.prop],
      ).catch((e: Error) => e);
      expect(Array.isArray(r) ? r.length === 0 : /permission denied/.test(r.message)).toBe(true);
      const [p] = await q<{ capacity: number; beds: number }>(
        "select capacity, beds from public.properties where id = $1",
        [ids.prop],
      );
      expect(p).toEqual({ capacity: 4, beds: 7 });
    });
  });
  it("another account and anon cannot read them", async () => {
    await as(db, who("other"), async (q) => {
      expect(
        await q("select capacity from public.properties where id = $1", [ids.prop]),
      ).toHaveLength(0);
    });
    await as(db, anon, async (q) => {
      await expect(q("select capacity from public.properties")).rejects.toThrow(
        /permission denied/,
      );
    });
  });
  it("anon cannot run onboarding", async () => {
    await as(db, anon, async (q) => {
      await expect(q("select public.create_account_onboarding('FAMILY','A','B')")).rejects.toThrow(
        /permission denied/,
      );
    });
  });
});

describe("remind_debt", () => {
  it("anon, another account and a member who left cannot remind; nobody reminds a member who left", async () => {
    await as(db, anon, async (q) => {
      await expect(q("select public.remind_debt($1,$2)", [ids.prop, ids.petr])).rejects.toThrow(
        /permission denied/,
      );
    });
    for (const k of ["other", "lea"] as const) {
      await as(db, who(k), async (q) => {
        await expect(q("select public.remind_debt($1,$2)", [ids.prop, ids.petr])).rejects.toThrow(
          /not_a_member/,
        );
      });
    }
    await as(db, who("owner"), async (q) => {
      await expect(q("select public.remind_debt($1,$2)", [ids.prop, ids.lea])).rejects.toThrow(
        /member_not_in_account/,
      );
      await expect(q("select public.remind_debt($1,$2)", [ids.prop, ids.otherM2])).rejects.toThrow(
        /member_not_in_account/,
      );
    });
  });
});

/**
 * T-057 (migration 0040): preferred language and email_lang(), cottage facts, members-only house
 * rules from onboarding, "I paid" claims (claim_payment / decide_payment_claim / the closing
 * trigger) and the reminder's sender in its payload.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { admin, as, asCommitted, freshDb, type Db } from "./harness";

const U = {
  owner: "57100000-0000-4000-8000-00000000000a",
  petr: "57100000-0000-4000-8000-00000000000b",
  jana: "57100000-0000-4000-8000-00000000000c",
  other: "57100000-0000-4000-8000-00000000000d",
  meta: "57100000-0000-4000-8000-00000000000e",
};
type Who = keyof typeof U;
const who = (k: Who) => ({
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

beforeAll(async () => {
  db = await freshDb();
  for (const [k, id] of Object.entries(U)) {
    await admin(
      db,
      "insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values ($1, $2, now(), $3)",
      [id, `${k}@example.org`, k === "meta" ? { lang: "en" } : {}],
    );
  }
  await asCommitted(
    db,
    who("owner"),
    `select public.create_account_onboarding(_type => 'FAMILY', _account_name => 'Rodina T',
       _property_name => 'Chata T', _rooms => 3, _capacity => 6,
       _house_rules => 'Klid po 22:00', _house_rules_en => 'Quiet after 10 pm')`,
  );
  ids.acct = await val("select account_id from public.members where user_id = $1", [U.owner]);
  ids.prop = await val("select id from public.properties where account_id = $1", [ids.acct]);
  ids.owner = await val("select id from public.members where user_id = $1", [U.owner]);
  for (const [k, name] of [
    ["petr", "Petr"],
    ["jana", "Jana"],
  ] as const) {
    ids[k] = await val(
      "insert into public.members (account_id, name, email, role, user_id) values ($1,$2,$3,'MEMBER',$4) returning id",
      [ids.acct, name, `${k}@example.org`, U[k]],
    );
  }
  const otherAcct = await val<string>(
    "insert into public.accounts (type, name) values ('FAMILY','Cizi') returning id",
  );
  ids.otherMember = await val(
    "insert into public.members (account_id, name, email, role, user_id) values ($1,'Cizi','other@example.org','ADMIN',$2) returning id",
    [otherAcct, U.other],
  );
  // Owner paid 900 split three ways; Petr owes 300 of it. Jana paid 200 for Petr too.
  ids.exp1 = await val(
    "insert into public.expenses (property_id, amount, category, description, paid_by_member_id) values ($1,900,'supplies','Drevo',$2) returning id",
    [ids.prop, ids.owner],
  );
  ids.split1 = await val(
    "insert into public.expense_splits (expense_id, member_id, amount_owed) values ($1,$2,300) returning id",
    [ids.exp1, ids.petr],
  );
  await admin(
    db,
    "insert into public.expense_splits (expense_id, member_id, amount_owed) values ($1,$2,300)",
    [ids.exp1, ids.jana],
  );
  ids.exp2 = await val(
    "insert into public.expenses (property_id, amount, category, description, paid_by_member_id) values ($1,200,'supplies','Plyn',$2) returning id",
    [ids.prop, ids.jana],
  );
  await admin(
    db,
    "insert into public.expense_splits (expense_id, member_id, amount_owed) values ($1,$2,200)",
    [ids.exp2, ids.petr],
  );
});

describe("preferred language", () => {
  it("a user sets their own language; other values are refused", async () => {
    await as(db, who("petr"), async (q) => {
      await q("insert into public.profiles (user_id, preferred_lang) values ($1,'en')", [U.petr]);
      await expect(
        q("update public.profiles set preferred_lang = 'de' where user_id = $1", [U.petr]),
      ).rejects.toThrow(/check/);
    });
  });
  it("email_lang reads the profile, then sign-up metadata; only the service role may call it", async () => {
    await admin(
      db,
      "insert into public.profiles (user_id, preferred_lang) values ($1,'en') on conflict (user_id) do update set preferred_lang = 'en'",
      [U.jana],
    );
    await as(db, { role: "service_role" }, async (q) => {
      const r = await q<{ l: string | null }>(
        "select public.email_lang('JANA@example.org') as l, public.email_lang('meta@example.org') as m, public.email_lang('owner@example.org') as o, public.email_lang('nobody@example.org') as n",
      );
      expect(r[0]).toEqual({ l: "en", m: "en", o: null, n: null });
    });
    for (const w of [who("jana"), anon]) {
      await as(db, w, async (q) => {
        await expect(q("select public.email_lang('jana@example.org')")).rejects.toThrow(
          /permission denied/,
        );
      });
    }
  });
});

describe("cottage facts and house rules", () => {
  it("onboarding stores capacity and members-only house rules in both languages", async () => {
    const [p] = (await admin(db, "select capacity from public.properties where id = $1", [
      ids.prop,
    ])) as { capacity: number }[];
    expect(p!.capacity).toBe(6);
    const rows = (await admin(
      db,
      "select visibility, content_cs, content_en from public.manual_sections where property_id = $1 and category = 'rules'",
      [ids.prop],
    )) as Record<string, string>[];
    expect(rows).toEqual([
      { visibility: "MEMBERS_ONLY", content_cs: "Klid po 22:00", content_en: "Quiet after 10 pm" },
    ]);
  });
  it("only an admin updates the facts; bad values are refused", async () => {
    await as(db, who("owner"), async (q) => {
      await q(
        "select public.update_property_details(_property_id => $1, _capacity => 8, _beds => 5, _check_in_time => '15:00', _check_out_time => '10:30', _pets_allowed => true)",
        [ids.prop],
      );
      const [r] = await q<Record<string, unknown>>(
        "select capacity, beds, check_in_time, check_out_time, pets_allowed, rooms from public.properties where id = $1",
        [ids.prop],
      );
      expect(r).toEqual({
        capacity: 8,
        beds: 5,
        check_in_time: "15:00",
        check_out_time: "10:30",
        pets_allowed: true,
        rooms: 3,
      });
      await expect(
        q("select public.update_property_details(_property_id => $1, _capacity => 0)", [ids.prop]),
      ).rejects.toThrow(/bad_capacity/);
      await expect(
        q("select public.update_property_details(_property_id => $1, _check_in_time => '25:00')", [
          ids.prop,
        ]),
      ).rejects.toThrow(/bad_time/);
    });
    await as(db, who("petr"), async (q) => {
      await expect(
        q("select public.update_property_details(_property_id => $1, _capacity => 9)", [ids.prop]),
      ).rejects.toThrow(/Admin role required/);
    });
  });
});

describe("I paid claims", () => {
  it("the debtor claims a payment; the payee is notified; a second claim returns the same one", async () => {
    await as(db, who("petr"), async (q) => {
      const [a] = await q<{ id: string }>("select public.claim_payment($1, $2) as id", [
        ids.prop,
        ids.owner,
      ]);
      const [b] = await q<{ id: string }>("select public.claim_payment($1, $2) as id", [
        ids.prop,
        ids.owner,
      ]);
      expect(a!.id).toBe(b!.id);
      const [c] = await q<{ amount: string; status: string }>(
        "select amount::text, status from public.payment_claims where id = $1",
        [a!.id],
      );
      expect(c).toEqual({ amount: "300", status: "PENDING" });
    });
  });
  it("can't claim towards someone owed nothing, or towards another account", async () => {
    await as(db, who("owner"), async (q) => {
      await expect(q("select public.claim_payment($1, $2)", [ids.prop, ids.petr])).rejects.toThrow(
        /nothing_owed/,
      );
      await expect(
        q("select public.claim_payment($1, $2)", [ids.prop, ids.otherMember]),
      ).rejects.toThrow(/member_not_in_account/);
    });
    await as(db, who("other"), async (q) => {
      await expect(q("select public.claim_payment($1, $2)", [ids.prop, ids.owner])).rejects.toThrow(
        /not_a_member/,
      );
      expect(await q("select * from public.payment_claims")).toHaveLength(0);
    });
    await as(db, anon, async (q) => {
      await expect(q("select * from public.payment_claims")).rejects.toThrow(/permission denied/);
    });
  });
  it("nobody writes claims directly", async () => {
    await as(db, who("petr"), async (q) => {
      await expect(
        q(
          "insert into public.payment_claims (account_id, property_id, from_member_id, to_member_id, amount) values ($1,$2,$3,$4,1)",
          [ids.acct, ids.prop, ids.petr, ids.owner],
        ),
      ).rejects.toThrow(/permission denied/);
      await expect(q("update public.payment_claims set status = 'CONFIRMED'")).rejects.toThrow(
        /permission denied/,
      );
    });
  });
  it("only the payee or an admin decides; confirming marks the shares paid and tells the debtor", async () => {
    await asCommitted(db, who("petr"), "select public.claim_payment($1, $2)", [
      ids.prop,
      ids.owner,
    ]);
    const claim = await val<string>(
      "select id from public.payment_claims where from_member_id = $1 and status = 'PENDING'",
      [ids.petr],
    );
    const notif = await val<string>(
      "select count(*)::text from public.notifications where recipient_member_id = $1 and kind = 'payment_claimed'",
      [ids.owner],
    );
    expect(notif).toBe("1");
    await as(db, who("jana"), async (q) => {
      await expect(q("select public.decide_payment_claim($1, true)", [claim])).rejects.toThrow(
        /only_receiver_confirms/,
      );
    });
    await asCommitted(db, who("owner"), "select public.decide_payment_claim($1, true)", [claim]);
    expect(
      await val("select paid_back from public.expense_splits where id = $1", [ids.split1]),
    ).toBe(true);
    expect(await val("select status from public.payment_claims where id = $1", [claim])).toBe(
      "CONFIRMED",
    );
    expect(
      await val(
        "select count(*)::text from public.notifications where recipient_member_id = $1 and kind = 'payment_confirmed'",
        [ids.petr],
      ),
    ).toBe("1");
    await as(db, who("owner"), async (q) => {
      await expect(q("select public.decide_payment_claim($1, false)", [claim])).rejects.toThrow(
        /already_decided/,
      );
    });
  });
  it("a per-expense claim the payee rejects leaves the share unpaid", async () => {
    await asCommitted(db, who("petr"), "select public.claim_payment($1, $2, $3)", [
      ids.prop,
      ids.jana,
      ids.exp2,
    ]);
    const claim = await val<string>(
      "select id from public.payment_claims where expense_id = $1 and status = 'PENDING'",
      [ids.exp2],
    );
    await asCommitted(db, who("jana"), "select public.decide_payment_claim($1, false)", [claim]);
    expect(
      await val(
        "select paid_back from public.expense_splits where expense_id = $1 and member_id = $2",
        [ids.exp2, ids.petr],
      ),
    ).toBe(false);
    expect(
      await val(
        "select count(*)::text from public.notifications where recipient_member_id = $1 and kind = 'payment_rejected'",
        [ids.petr],
      ),
    ).toBe("1");
  });
  it("an open claim closes by itself when the debt is settled another way", async () => {
    await asCommitted(db, who("petr"), "select public.claim_payment($1, $2, $3)", [
      ids.prop,
      ids.jana,
      ids.exp2,
    ]);
    await asCommitted(db, who("jana"), "select public.settle_debt($1, $2, $3)", [
      ids.prop,
      ids.petr,
      ids.jana,
    ]);
    expect(
      await val(
        "select count(*)::text from public.payment_claims where expense_id = $1 and status = 'PENDING'",
        [ids.exp2],
      ),
    ).toBe("0");
  });
});

describe("I paid claims: review fixes", () => {
  it("an admin can't confirm their own claim", async () => {
    const e = await val<string>(
      "insert into public.expenses (property_id, amount, category, description, paid_by_member_id) values ($1,100,'supplies','Sul',$2) returning id",
      [ids.prop, ids.petr],
    );
    await admin(
      db,
      "insert into public.expense_splits (expense_id, member_id, amount_owed) values ($1,$2,100)",
      [e, ids.owner],
    );
    await asCommitted(db, who("owner"), "select public.claim_payment($1, $2, $3)", [
      ids.prop,
      ids.petr,
      e,
    ]);
    const claim = await val<string>("select id from public.payment_claims where expense_id = $1", [
      e,
    ]);
    await as(db, who("owner"), async (q) => {
      await expect(q("select public.decide_payment_claim($1, true)", [claim])).rejects.toThrow(
        /only_receiver_confirms/,
      );
    });
  });
  it("confirming settles only what was owed when the payment was reported", async () => {
    const before = await val<string>(
      "insert into public.expenses (property_id, amount, category, description, paid_by_member_id, created_at) values ($1,50,'supplies','Pred',$2, now() - interval '1 hour') returning id",
      [ids.prop, ids.jana],
    );
    await admin(
      db,
      "insert into public.expense_splits (expense_id, member_id, amount_owed) values ($1,$2,50)",
      [before, ids.petr],
    );
    await asCommitted(db, who("petr"), "select public.claim_payment($1, $2)", [ids.prop, ids.jana]);
    const claim = await val<string>(
      "select id from public.payment_claims where from_member_id = $1 and to_member_id = $2 and expense_id is null and status = 'PENDING'",
      [ids.petr, ids.jana],
    );
    await admin(
      db,
      "update public.payment_claims set created_at = now() - interval '30 minutes' where id = $1",
      [claim],
    );
    const after = await val<string>(
      "insert into public.expenses (property_id, amount, category, description, paid_by_member_id) values ($1,70,'supplies','Po',$2) returning id",
      [ids.prop, ids.jana],
    );
    await admin(
      db,
      "insert into public.expense_splits (expense_id, member_id, amount_owed) values ($1,$2,70)",
      [after, ids.petr],
    );
    await asCommitted(db, who("jana"), "select public.decide_payment_claim($1, true)", [claim]);
    expect(
      await val("select paid_back from public.expense_splits where expense_id = $1", [before]),
    ).toBe(true);
    expect(
      await val("select paid_back from public.expense_splits where expense_id = $1", [after]),
    ).toBe(false);
  });
});

describe("debt reminder", () => {
  it("names the member who sent it", async () => {
    await admin(db, "update public.expense_splits set paid_back = false where id = $1", [
      ids.split1,
    ]);
    await asCommitted(db, who("owner"), "select public.remind_debt($1, $2)", [ids.prop, ids.petr]);
    expect(
      await val(
        "select payload->>'from_member_id' from public.notifications where kind = 'debt_reminder' and recipient_member_id = $1",
        [ids.petr],
      ),
    ).toBe(ids.owner);
  });
});

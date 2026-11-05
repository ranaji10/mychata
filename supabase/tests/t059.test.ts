/**
 * T-059 (migration 0042): an expense is paid by the caller unless an admin enters it (O-21), and
 * cottage rooms / overlap limits are whole positive numbers.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { admin, as, asCommitted, freshDb, type Db } from "./harness";

const U = {
  owner: "59100000-0000-4000-8000-00000000000a",
  petr: "59100000-0000-4000-8000-00000000000b",
  jana: "59100000-0000-4000-8000-00000000000c",
};
type Who = keyof typeof U;
const who = (k: Who) => ({
  role: "authenticated" as const,
  userId: U[k],
  email: `${k}@example.org`,
});

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
      "insert into auth.users (id, email, email_confirmed_at) values ($1, $2, now())",
      [id, `${k}@example.org`],
    );
  }
  await asCommitted(
    db,
    who("owner"),
    `select public.create_account_onboarding(_type => 'FAMILY', _account_name => 'Rodina P',
       _property_name => 'Chata P', _rooms => 2)`,
  );
  ids.acct = await val("select account_id from public.members where user_id = $1", [U.owner]);
  ids.prop = await val("select id from public.properties where account_id = $1", [ids.acct]);
  ids.owner = await val("select id from public.members where user_id = $1", [U.owner]);
  for (const k of ["petr", "jana"] as const) {
    ids[k] = await val(
      "insert into public.members (account_id, name, email, role, user_id) values ($1,$2,$3,'MEMBER',$4) returning id",
      [ids.acct, k, `${k}@example.org`, U[k]],
    );
  }
  ids.janaExp = await val(
    "insert into public.expenses (property_id, amount, category, paid_by_member_id) values ($1,300,'supplies',$2) returning id",
    [ids.prop, ids.jana],
  );
});

describe("O-21: who an expense is paid by", () => {
  it("a member adds an expense they paid, with shares", async () => {
    await as(db, who("petr"), async (q) => {
      const [e] = await q<{ id: string }>(
        "insert into public.expenses (property_id, amount, category, paid_by_member_id) values ($1,100,'supplies',$2) returning id",
        [ids.prop, ids.petr],
      );
      await q(
        "insert into public.expense_splits (expense_id, member_id, amount_owed) values ($1,$2,50)",
        [e!.id, ids.jana],
      );
    });
  });

  it("a member cannot enter an expense paid by someone else, or by nobody", async () => {
    for (const payer of ["jana", "owner"] as const) {
      await as(db, who("petr"), async (q) => {
        await expect(
          q(
            "insert into public.expenses (property_id, amount, category, paid_by_member_id) values ($1,100,'supplies',$2)",
            [ids.prop, ids[payer]],
          ),
        ).rejects.toThrow(/row-level security/);
      });
    }
    await as(db, who("petr"), async (q) => {
      await expect(
        q(
          "insert into public.expenses (property_id, amount, category) values ($1,100,'supplies')",
          [ids.prop],
        ),
      ).rejects.toThrow(/row-level security/);
    });
  });

  it("a member cannot add a share to someone else's expense", async () => {
    await as(db, who("petr"), async (q) => {
      await expect(
        q(
          "insert into public.expense_splits (expense_id, member_id, amount_owed) values ($1,$2,999)",
          [ids.janaExp, ids.owner],
        ),
      ).rejects.toThrow(/row-level security/);
    });
  });

  it("the payer cannot hand their expense to someone else", async () => {
    await as(db, who("jana"), async (q) => {
      await expect(
        q("update public.expenses set paid_by_member_id = $2 where id = $1", [
          ids.janaExp,
          ids.petr,
        ]),
      ).rejects.toThrow(/row-level security/);
      await q("update public.expenses set amount = 320 where id = $1", [ids.janaExp]);
    });
  });

  it("an admin can still enter an expense for another member and add its shares", async () => {
    await as(db, who("owner"), async (q) => {
      const [e] = await q<{ id: string }>(
        "insert into public.expenses (property_id, amount, category, paid_by_member_id) values ($1,400,'repairs',$2) returning id",
        [ids.prop, ids.jana],
      );
      await q(
        "insert into public.expense_splits (expense_id, member_id, amount_owed) values ($1,$2,200)",
        [e!.id, ids.petr],
      );
      await q("update public.expenses set paid_by_member_id = $2 where id = $1", [e!.id, ids.petr]);
    });
  });
});

describe("cottage numbers", () => {
  it("rooms and the overlap limit must be whole numbers from 1", async () => {
    for (const sql of [
      "update public.properties set rooms = -3 where id = $1",
      "update public.properties set rooms = 0 where id = $1",
      "update public.properties set overlap_max_guests = 0 where id = $1",
    ]) {
      await expect(admin(db, sql, [ids.prop])).rejects.toThrow(/check constraint/);
    }
    await admin(
      db,
      "update public.properties set rooms = 4, overlap_max_guests = 6 where id = $1",
      [ids.prop],
    );
  });

  it("onboarding refuses negative rooms instead of saving them", async () => {
    await admin(
      db,
      "insert into auth.users (id, email, email_confirmed_at) values ($1, $2, now())",
      ["59100000-0000-4000-8000-0000000000ff", "neg@example.org"],
    );
    await as(
      db,
      {
        role: "authenticated",
        userId: "59100000-0000-4000-8000-0000000000ff",
        email: "neg@example.org",
      },
      async (q) => {
        await expect(
          q(
            `select public.create_account_onboarding(_type => 'FAMILY', _account_name => 'Rodina N',
               _property_name => 'Chata N', _rooms => -3)`,
          ),
        ).rejects.toThrow(/check constraint/);
      },
    );
  });
});

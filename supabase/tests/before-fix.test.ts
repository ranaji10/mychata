/**
 * Evidence for the defects found on 25 Sep 2026: the same checks run against the schema as it
 * was before migration 0011 (migrations up to 0010). If one of these starts failing, the old
 * schema no longer behaves as described in docs/STATUS.md and that note should be updated.
 */
import { beforeAll, expect, it } from "vitest";
import { admin, as, freshDb, type Db } from "./harness";

let db: Db;
const A = "20000000-0000-4000-8000-00000000000a";
const B = "20000000-0000-4000-8000-00000000000b";
let propA = "";

beforeAll(async () => {
  db = await freshDb({ upTo: "0010_" });
  const [acctA] = await admin(
    db,
    "insert into public.accounts (type,name) values ('FAMILY','A') returning id",
  );
  const [acctB] = await admin(
    db,
    "insert into public.accounts (type,name) values ('FAMILY','B') returning id",
  );
  const [p] = await admin(
    db,
    "insert into public.properties (account_id,name) values ($1,'A') returning id",
    [(acctA as { id: string }).id],
  );
  propA = (p as { id: string }).id;
  await admin(
    db,
    "insert into public.members (account_id,name,user_id,role) values ($1,'a',$2,'MEMBER')",
    [(acctA as { id: string }).id, A],
  );
  await admin(
    db,
    "insert into public.members (account_id,name,user_id,role) values ($1,'b',$2,'MEMBER')",
    [(acctB as { id: string }).id, B],
  );
  const [s] = await admin(
    db,
    "insert into public.manual_sections (property_id,title_cs,title_en,content_cs,content_en) values ($1,'Wi-Fi','Wi-Fi','heslo','pw') returning id",
    [propA],
  );
  await admin(
    db,
    `insert into public.manual_chunks (property_id, section_id, content, embedding)
     values ($1, $2, 'heslo', array_fill(0.1::real, array[768])::vector)`,
    [propA, (s as { id: string }).id],
  );
}, 120_000);

it("defect 3: anyone can list PUBLIC manual sections of every property", async () => {
  await as(db, { role: "anon" }, async (q) => {
    expect((await q("select * from public.manual_sections")).length).toBe(1);
  });
});

it("defect 1: another account's user, and even anon, can read chunks via match_manual_chunks", async () => {
  const vec = `[${Array(768).fill(0.1).join(",")}]`;
  await as(db, { role: "authenticated", userId: B }, async (q) => {
    expect(
      (await q("select * from public.match_manual_chunks($1, $2::vector, 50)", [propA, vec]))
        .length,
    ).toBe(1);
  });
  await as(db, { role: "anon" }, async (q) => {
    expect(
      (await q("select * from public.match_manual_chunks($1, $2::vector, 50)", [propA, vec]))
        .length,
    ).toBe(1);
  });
});

it("defect 2: manual_chunks has no lang column, so the app's inserts fail", async () => {
  const cols = await admin(
    db,
    "select 1 from information_schema.columns where table_name = 'manual_chunks' and column_name = 'lang'",
  );
  expect(cols).toHaveLength(0);
});

it("defect 5: the browser cannot write user_roles, so make/remove admin always fails", async () => {
  await as(db, { role: "authenticated", userId: A }, async (q) => {
    await expect(
      q("insert into public.user_roles (user_id, role) values ($1,'admin')", [A]),
    ).rejects.toThrow(/permission denied/);
  });
});

it("defect 6: anonymous guest request inserts are refused", async () => {
  await as(db, { role: "anon" }, async (q) => {
    await expect(
      q(
        "insert into public.guest_requests (guest_link_id, property_id, guest_name, start_date, end_date) values (gen_random_uuid(), $1, 'x', current_date, current_date)",
        [propA],
      ),
    ).rejects.toThrow(/permission denied/);
  });
});

it("latent: a member can set their own role column to ADMIN", async () => {
  await as(db, { role: "authenticated", userId: A }, async (q) => {
    await q("update public.members set role = 'ADMIN' where user_id = $1", [A]);
    const [r] = await q<{ role: string }>("select role from public.members where user_id = $1", [
      A,
    ]);
    expect(r?.role).toBe("ADMIN");
  });
});

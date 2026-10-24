/**
 * T-016 (prompt CP-1, run 25 Oct 2026 as T-044): database rules that had no test.
 * One test per rule in docs/tasks/T-016-tests-for-untested-database-rules.md. Own in-memory
 * database, invented data only. Each test is rolled back unless it says otherwise.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { admin, as, freshDb, type Db } from "./harness";

const U = {
  admin: "20000000-0000-4000-8000-00000000000a",
  member: "20000000-0000-4000-8000-00000000000b",
  other: "20000000-0000-4000-8000-00000000000c",
};
let db: Db;
const ids: Record<string, string> = {};
const anon = { role: "anon" as const };
const asAdmin = { role: "authenticated" as const, userId: U.admin, email: "spravce@example.org" };
const asMember = { role: "authenticated" as const, userId: U.member, email: "clen@example.org" };
const asOther = { role: "authenticated" as const, userId: U.other, email: "cizi@example.org" };

async function first(sql: string, params?: unknown[]) {
  return (await admin(db, sql, params))[0] as Record<string, string>;
}

beforeAll(async () => {
  db = await freshDb();
  ids.fam = (
    await first(
      "insert into public.accounts (type, name) values ('FAMILY','Rodina T') returning id",
    )
  ).id!;
  ids.inst = (
    await first(
      "insert into public.accounts (type, name) values ('INSTITUTIONAL','Spolek T') returning id",
    )
  ).id!;
  ids.otherAcct = (
    await first("insert into public.accounts (type, name) values ('FAMILY','Cizí') returning id")
  ).id!;
  const p = await first(
    "insert into public.properties (account_id, name, address) values ($1,'Chata T','Adresa 1') returning id, public_token",
    [ids.fam],
  );
  ids.prop = p.id!;
  ids.token = p.public_token!;
  const pi = await first(
    "insert into public.properties (account_id, name, address) values ($1,'Klubovna','Adresa 2') returning id, public_token",
    [ids.inst],
  );
  ids.instProp = pi.id!;
  ids.instToken = pi.public_token!;
  ids.admin = (
    await first(
      "insert into public.members (account_id, name, email, role, user_id) values ($1,'Správce','spravce@example.org','ADMIN',$2) returning id",
      [ids.fam, U.admin],
    )
  ).id!;
  ids.member = (
    await first(
      "insert into public.members (account_id, name, email, role, user_id) values ($1,'Člen','clen@example.org','MEMBER',$2) returning id",
      [ids.fam, U.member],
    )
  ).id!;
  await admin(
    db,
    "insert into public.members (account_id, name, email, role, user_id) values ($1,'Cizí','cizi@example.org','ADMIN',$2)",
    [ids.otherAcct, U.other],
  );
  ids.link = (
    await first(
      "insert into public.guest_links (property_id, token) values ($1,'t016-guest-link-00') returning id",
      [ids.prop],
    )
  ).id!;
}, 120_000);

describe("T-016 rule 1: switched-off public forms refuse inserts", () => {
  it("guest requests and anonymous institution requests stop when their flag is off", async () => {
    await admin(
      db,
      "update public.feature_flags set enabled = false where key in ('guest_requests','institutional_requests')",
    );
    try {
      await as(db, anon, async (q) => {
        await expect(
          q(
            "select public.submit_guest_request('t016-guest-link-00','Host T','host@example.org', current_date + 5, current_date + 6, 2)",
          ),
        ).rejects.toThrow(/feature_disabled/);
        await expect(
          q(
            "select public.submit_institutional_request($1,'Žadatel','zadatel@example.org',null,null, current_date + 5, current_date + 6, 2)",
            [ids.instToken],
          ),
        ).rejects.toThrow(/feature_disabled/);
      });
    } finally {
      await admin(
        db,
        "update public.feature_flags set enabled = true where key in ('guest_requests','institutional_requests')",
      );
    }
  });
});

describe("T-016 rule 2: decisions are written to the audit log", () => {
  it("a role change and a booking status change each leave a row", async () => {
    const b = await first(
      "insert into public.bookings (property_id, requester_name, requester_member_id, start_date, end_date, status) values ($1,'Člen',$2, current_date + 30, current_date + 32, 'PENDING') returning id",
      [ids.prop, ids.member],
    );
    await as(db, asAdmin, async (q) => {
      await q("select public.set_member_role($1,'ADMIN')", [ids.member]);
      await q("update public.bookings set status = 'CONFIRMED' where id = $1", [b.id]);
      const rows = await q<{ action: string }>(
        "select action from public.audit_log where target_id in ($1, $2) order by id",
        [ids.member, b.id],
      );
      expect(rows.map((r) => r.action)).toEqual(["member_role_changed", "bookings_status_changed"]);
    });
    await admin(db, "delete from public.bookings where id = $1", [b.id]);
  });
  it("a guest request decision is audited too", async () => {
    const r = await first(
      "insert into public.guest_requests (guest_link_id, property_id, guest_name, start_date, end_date, guests) values ($1,$2,'Host A', current_date + 40, current_date + 41, 1) returning id",
      [ids.link, ids.prop],
    );
    await as(db, asAdmin, async (q) => {
      await q("select public.decide_guest_request($1, false)", [r.id]);
      expect(
        await q(
          "select 1 from public.audit_log where action = 'guest_requests_status_changed' and target_id = $1",
          [r.id],
        ),
      ).toHaveLength(1);
    });
    await admin(db, "delete from public.guest_requests where id = $1", [r.id]);
  });
});

describe("T-016 rule 3: flagging a public manual section", () => {
  it("works only for PUBLIC sections and stops adding after 20 open flags", async () => {
    const pub = await first(
      "insert into public.manual_sections (property_id, title_cs, title_en, content_cs, content_en, visibility) values ($1,'Klíče','Keys','Pod rohožkou','Under the mat','PUBLIC') returning id",
      [ids.prop],
    );
    const priv = await first(
      "insert into public.manual_sections (property_id, title_cs, title_en, content_cs, content_en, visibility) values ($1,'Wi-Fi','Wi-Fi','x','x','MEMBERS_ONLY') returning id",
      [ids.prop],
    );
    await as(db, anon, async (q) => {
      const no = await q<{ r: boolean }>("select public.public_flag_manual_section($1,$2) as r", [
        ids.token,
        priv.id,
      ]);
      expect(no[0]!.r).toBe(false);
      for (let i = 0; i < 25; i++) {
        await q("select public.public_flag_manual_section($1,$2)", [ids.token, pub.id]);
      }
      // Counted as the table owner inside the same (rolled-back) transaction.
      await q("reset role");
      const [n] = await q<{ n: number }>(
        "select count(*)::int as n from public.manual_feedback where section_id = $1",
        [pub.id],
      );
      expect(n!.n).toBe(20);
      const [none] = await q<{ n: number }>(
        "select count(*)::int as n from public.manual_feedback where section_id = $1",
        [priv.id],
      );
      expect(none!.n).toBe(0);
    });
  });
});

describe("T-016 rule 4: institution form rate limits", () => {
  it("3 requests per e-mail a day", async () => {
    await as(db, anon, async (q) => {
      const send = async (email: string) =>
        (
          await q<{ r: string }>(
            "select public.submit_institutional_request($1,'Žadatel',$2,null,null, current_date + 5, current_date + 6, 2) as r",
            [ids.instToken, email],
          )
        )[0]!.r;
      expect(await send("limit@example.org")).toBe("ok");
      expect(await send("limit@example.org")).toBe("ok");
      expect(await send("LIMIT@example.org")).toBe("ok");
      expect(await send("limit@example.org")).toBe("rate");
      expect(await send("jiny@example.org")).toBe("ok");
    });
  });
  it("50 requests per cottage a day", async () => {
    await admin(
      db,
      "insert into public.institutional_requests (property_id, requester_name, requester_email, start_date, end_date, guests, status) select $1, 'Hromadně', 'h' || g || '@example.org', current_date + 5, current_date + 6, 1, 'PENDING' from generate_series(1, 50) g",
      [ids.instProp],
    );
    try {
      await as(db, anon, async (q) => {
        const r = await q<{ r: string }>(
          "select public.submit_institutional_request($1,'Žadatel','novy@example.org',null,null, current_date + 5, current_date + 6, 2) as r",
          [ids.instToken],
        );
        expect(r[0]!.r).toBe("rate");
      });
    } finally {
      await admin(
        db,
        "delete from public.institutional_requests where requester_name = 'Hromadně'",
      );
    }
  });
});

describe("T-016 rule 5: public link switches are admin-only", () => {
  it("members and other accounts can't publish the calendar or rotate the token; the admin can", async () => {
    for (const who of [asMember, asOther]) {
      await as(db, who, async (q) => {
        await expect(q("select public.set_public_calendar($1, true)", [ids.prop])).rejects.toThrow(
          /Admin/,
        );
        await expect(q("select public.rotate_public_token($1)", [ids.prop])).rejects.toThrow(
          /Admin/,
        );
      });
    }
    await as(db, anon, async (q) => {
      await expect(q("select public.rotate_public_token($1)", [ids.prop])).rejects.toThrow(
        /permission denied/,
      );
    });
    await as(db, asAdmin, async (q) => {
      await q("select public.rotate_public_token($1)", [ids.prop]);
      const [row] = await q<{ public_token: string }>(
        "select public_token from public.properties where id = $1",
        [ids.prop],
      );
      expect(row!.public_token).not.toBe(ids.token);
    });
  });
});

describe("T-016 rule 6: consent log", () => {
  it("accepts anonymous rows and the caller's own, never someone else's", async () => {
    await as(db, anon, async (q) => {
      await q(
        "insert into public.consent_log (anonymous_id, analytics, version) values ('anon-1', true, 'v1')",
      );
      await expect(
        q("insert into public.consent_log (user_id, analytics, version) values ($1, true, 'v1')", [
          U.member,
        ]),
      ).rejects.toThrow(/row-level security/);
    });
    await as(db, asAdmin, async (q) => {
      await q(
        "insert into public.consent_log (user_id, analytics, version) values ($1, false, 'v1')",
        [U.admin],
      );
      await expect(
        q("insert into public.consent_log (user_id, analytics, version) values ($1, true, 'v1')", [
          U.member,
        ]),
      ).rejects.toThrow(/row-level security/);
      // Nobody reads the log through the API.
      await expect(q("select * from public.consent_log")).rejects.toThrow(/permission denied/);
    });
  });
});

describe("T-016 rule 7: the owner role is fixed", () => {
  it("set_member_role refuses to change an OWNER", async () => {
    const o = await first(
      "insert into public.members (account_id, name, email, role) values ($1,'Vlastník','vlastnik@example.org','OWNER') returning id",
      [ids.fam],
    );
    try {
      await as(db, asAdmin, async (q) => {
        await expect(q("select public.set_member_role($1,'MEMBER')", [o.id])).rejects.toThrow(
          /owner_role_is_fixed/,
        );
      });
    } finally {
      await admin(db, "delete from public.members where id = $1", [o.id]);
    }
  });
});

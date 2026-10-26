// T-042: requests of 18 Oct 2026 (counts, auto booking approval, notifications, account names).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { accountNameFromEmail, familyAccountsNamedLikeCottage } from "@/lib/account-label";
import type { Booking } from "@/lib/data";
import { buildNotifications, type NotificationInput } from "@/lib/notification-list";

const TODAY = "2026-10-18";
const base: NotificationInput = {
  today: TODAY,
  myMemberId: "admin",
  isAdmin: true,
  isFamily: false,
  hasName: true,
  propertyName: "Chata Alfa",
  members: [],
};

function booking(over: Partial<Booking>): Booking {
  return {
    id: "b1",
    property_id: "p",
    requester_name: "Petr",
    requester_member_id: "petr",
    start_date: "2026-11-01",
    end_date: "2026-11-03",
    guests: 2,
    note: null,
    status: "CONFIRMED",
    created_at: "2026-10-18T09:00:00",
    auto_approved: true,
    ...over,
  };
}

describe("auto-approved bookings in Notifications", () => {
  it("one booking: names the booker and opens the stay", () => {
    const [n, ...rest] = buildNotifications({ ...base, bookings: [booking({})] });
    expect(rest).toEqual([]);
    expect(n).toMatchObject({ kind: "auto_approved", to: "/rezervace/$id", params: { id: "b1" } });
    expect(n!.title[1]).toBe("Booking confirmed automatically: Petr (Chata Alfa)");
  });

  it("several on one day become one line; another day is its own line", () => {
    const items = buildNotifications({
      ...base,
      bookings: [
        booking({ id: "a" }),
        booking({ id: "b", requester_name: "Jana" }),
        booking({ id: "c" }),
        booking({ id: "d", requester_name: "Eva" }),
        booking({ id: "e", created_at: "2026-10-16T09:00:00" }),
      ],
    });
    expect(items.map((i) => i.title[1])).toEqual([
      "4 bookings were confirmed automatically for Chata Alfa",
      "Booking confirmed automatically: Petr (Chata Alfa)",
    ]);
    expect(items[0]!.title[0]).toBe("4 pobyty byly automaticky potvrzeny pro Chata Alfa");
    expect(items[0]!.detail![1]).toBe("18.10.2026 · Petr, Jana, Eva");
    expect(items[0]!.to).toBe("/kalendar");
  });

  it("Czech plural for five and more", () => {
    const items = buildNotifications({
      ...base,
      bookings: ["a", "b", "c", "d", "e"].map((id) => booking({ id })),
    });
    expect(items[0]!.title[0]).toBe("5 pobytů bylo automaticky potvrzeno pro Chata Alfa");
  });

  it("leaves out the admin's own, decided, held, old ones, and shows nothing to members", () => {
    const bookings = [
      booking({ id: "own", requester_member_id: "admin" }),
      booking({ id: "decided", auto_approved: false }),
      booking({ id: "held", status: "PENDING", auto_approved: false }),
      booking({ id: "old", created_at: "2026-09-01T09:00:00" }),
    ];
    expect(buildNotifications({ ...base, bookings }).map((n) => n.key)).toEqual(["approval:held"]);
    expect(buildNotifications({ ...base, isAdmin: false, bookings: [booking({})] })).toEqual([]);
  });

  it("a new booking the same day changes the key, so the badge shows again", () => {
    const one = buildNotifications({ ...base, bookings: [booking({ id: "a" })] });
    const two = buildNotifications({
      ...base,
      bookings: [booking({ id: "a" }), booking({ id: "b" })],
    });
    expect(one[0]!.key).not.toBe(two[0]!.key);
  });
});

describe("account names (T-042)", () => {
  it("starts from the part of the email before the @", () => {
    expect(accountNameFromEmail("jan.novak@seznam.cz")).toBe("jan.novak");
    expect(accountNameFromEmail(null)).toBe("");
  });

  it("asks admins of a family account named like a cottage to rename it", () => {
    const accounts = [
      { id: "f", type: "FAMILY", name: "Chata Alfa (test)" },
      { id: "g", type: "FAMILY", name: "Novákovi" },
      { id: "o", type: "INSTITUTIONAL", name: "Skola" },
      { id: "m", type: "FAMILY", name: "Chata Beta" },
    ];
    const cottages = {
      f: [{ name: "chata alfa (test) " }, { name: "Chata Beta (test)" }],
      g: [{ name: "Chata Gama" }],
      o: [{ name: "Skola" }],
      m: [{ name: "Chata Beta" }],
    };
    // "m" clashes but the person is only a member there.
    expect(familyAccountsNamedLikeCottage(accounts, ["f", "g", "o"], cottages)).toEqual([
      accounts[0],
    ]);
    const items = buildNotifications({
      ...base,
      accountsToRename: [{ id: "f", name: "Chata Alfa (test)" }],
    });
    expect(items.map((i) => [i.kind, i.to])).toEqual([["profile", "/profil"]]);
  });
});

describe("wiring (T-042)", () => {
  const read = (p: string) => readFileSync(join(__dirname, "..", p), "utf8");

  it("onboarding asks families for an account name and organisations for auto approval", () => {
    const src = read("routes/onboarding.tsx");
    expect(src).toContain('t("Název účtu", "Account name")');
    expect(src).toContain("_booking_auto_approve");
    expect(src).toContain("<AutoApproveChoice");
  });

  it("Members & permissions prompts organisations; the booking screen knows they hold", () => {
    expect(read("routes/clenove.tsx")).toContain("set_booking_auto_approve");
    expect(read("routes/rezervace.nova.tsx")).toContain("booking_auto_approve !== true");
  });

  it("the cottages overview counts photos, manual, documents and maintenance", () => {
    const src = read("routes/chaty.tsx");
    for (const table of ["property_photos", "manual_sections", "documents", "tasks"]) {
      expect(src).toContain(`"${table}"`);
    }
  });
});

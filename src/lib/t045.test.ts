import { describe, expect, it } from "vitest";
import { accountTypeChangeError, nextTypeChange } from "./account-type";
import { debtSummary, settlementSuggestions } from "./data";

const t = (cs: string) => cs;

describe("Home's expenses tile agrees with Settle debts (D-25)", () => {
  // Petr paid 300 for three (Jana and Eva owe 100 each); Jana paid 150 for Jana and Petr.
  const expenses = [
    { id: "e1", paid_by_member_id: "petr" },
    { id: "e2", paid_by_member_id: "jana" },
  ];
  const splits = [
    { expense_id: "e1", member_id: "jana", amount_owed: 100, paid_back: false },
    { expense_id: "e1", member_id: "eva", amount_owed: 100, paid_back: false },
    { expense_id: "e2", member_id: "petr", amount_owed: 75, paid_back: false },
  ];
  const suggestions = settlementSuggestions(expenses, splits);

  it("nets each pair: Jana owes Petr 25, Eva owes Petr 100", () => {
    expect(suggestions).toEqual(
      expect.arrayContaining([
        { from: "jana", to: "petr", amount: 25 },
        { from: "eva", to: "petr", amount: 100 },
      ]),
    );
    expect(suggestions).toHaveLength(2);
  });

  it("shows what the viewer owes first, then what they are owed and the cottage total", () => {
    expect(debtSummary(suggestions, "jana")).toEqual({
      youOwe: 25,
      owedToYou: 0,
      cottageTotal: 125,
    });
    expect(debtSummary(suggestions, "petr")).toEqual({
      youOwe: 0,
      owedToYou: 125,
      cottageTotal: 125,
    });
    // The old tile added every open share: 275, which no screen could explain.
    expect(splits.reduce((s, x) => s + x.amount_owed, 0)).toBe(275);
  });

  it("is zero for everyone once settled", () => {
    const settled = splits.map((s) => ({ ...s, paid_back: true }));
    expect(debtSummary(settlementSuggestions(expenses, settled), "jana")).toEqual({
      youOwe: 0,
      owedToYou: 0,
      cottageTotal: 0,
    });
  });
});

describe("account type changes once in six months (D-03)", () => {
  it("allows a change when none was made", () => {
    expect(nextTypeChange(null)).toBeNull();
  });
  it("counts six calendar months like Postgres, clamped to the month's end", () => {
    expect(nextTypeChange("2026-08-31T10:00:00Z", new Date("2026-10-25T00:00:00Z"))).toBe(
      "2027-02-28T10:00:00.000Z",
    );
    expect(nextTypeChange("2026-04-01T10:00:00Z", new Date("2026-10-25T00:00:00Z"))).toBeNull();
  });
  it("words the database's refusals", () => {
    expect(accountTypeChangeError("type_change_cooldown:2027-04-25", t)).toContain("25.04.2027");
    expect(accountTypeChangeError("owner_required", t)).toContain("vlastník");
    expect(accountTypeChangeError("billing_change_required", t)).toContain("placený");
  });
});

describe("live analytics shares (D-28)", () => {
  it("keeps the top rows as whole percents and folds the rest into Other", async () => {
    const { toShares } = await import("./analytics-live.functions");
    const report = {
      rows: [
        ["Chrome", 80],
        ["Safari", 10],
        ["Firefox", 6],
        ["Edge", 2],
        ["Opera", 2],
      ].map(([v, n]) => ({
        dimensionValues: [{ value: String(v) }],
        metricValues: [{ value: String(n) }],
      })),
    };
    expect(toShares(report, (v) => [v, v], 3)).toEqual([
      { label: ["Chrome", "Chrome"], pct: 80 },
      { label: ["Safari", "Safari"], pct: 10 },
      { label: ["Firefox", "Firefox"], pct: 6 },
      { label: ["Ostatní", "Other"], pct: 4 },
    ]);
    expect(toShares({}, (v) => [v, v])).toEqual([]);
  });
});

describe("debts are shown to the haléř (25 Oct check)", () => {
  it("keeps whole amounts short and shows hellers when there are any", async () => {
    const { fmtKcExact } = await import("./data");
    expect(fmtKcExact(4000)).toBe("4 000 Kč");
    expect(fmtKcExact(333.34)).toBe("333,34 Kč");
    expect(fmtKcExact(666.67)).toBe("666,67 Kč");
    expect(fmtKcExact(1234.5)).toBe("1 234,50 Kč");
  });
});

describe("ownership offers reach the person offered (25 Oct)", () => {
  it("lists an offer as something that needs them, linking to Members", async () => {
    const { buildNotifications } = await import("./notification-list");
    const items = buildNotifications({
      today: "2026-10-25",
      myMemberId: "m2",
      isAdmin: true,
      isFamily: true,
      hasName: true,
      members: [],
      ownershipOffers: [
        {
          id: "o1",
          account_name: "Rodina A",
          from_name: "Anna",
          created_at: "2026-10-25T10:00:00Z",
        },
      ],
    });
    const offer = items.find((i) => i.kind === "ownership_offer");
    expect(offer?.tone).toBe("action");
    expect(offer?.to).toBe("/clenove");
    expect(offer?.title[0]).toContain("Rodina A");
  });
});

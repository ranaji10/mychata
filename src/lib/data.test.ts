import { describe, expect, it } from "vitest";
import {
  buildChecklistState,
  checklistProgress,
  expenseSettlement,
  findConflicts,
  fmtDate,
  fmtKc,
  isSameDayChangeover,
  rangesOverlap,
} from "./data";

const booking = (start: string, end: string, name = "Petra") => ({
  requester_name: name,
  start_date: start,
  end_date: end,
});

describe("booking overlap rules", () => {
  it("ranges that share a day overlap", () => {
    expect(rangesOverlap("2026-10-01", "2026-10-05", "2026-10-05", "2026-10-07")).toBe(true);
    expect(rangesOverlap("2026-10-01", "2026-10-04", "2026-10-05", "2026-10-07")).toBe(false);
  });
  it("arriving the day someone leaves is a same-day changeover, not a hard conflict", () => {
    expect(isSameDayChangeover("2026-10-05", "2026-10-07", "2026-10-01", "2026-10-05")).toBe(true);
    const c = findConflicts("2026-10-05", "2026-10-07", [booking("2026-10-01", "2026-10-05")]);
    expect(c).toHaveLength(1);
    expect(c[0]!.kind).toBe("same-day");
  });
  it("a stay inside another stay is a hard conflict", () => {
    const c = findConflicts("2026-10-02", "2026-10-03", [booking("2026-10-01", "2026-10-05")]);
    expect(c[0]!.kind).toBe("hard");
  });
  it("no bookings, no conflicts", () => {
    expect(findConflicts("2026-10-02", "2026-10-03", [])).toEqual([]);
  });
});

describe("formatting", () => {
  it("formats Czech dates and crowns", () => {
    expect(fmtDate("2026-09-25")).toBe("25.09.2026");
    expect(fmtDate(null)).toBe("—");
    expect(fmtKc(1234567)).toBe("1 234 567 Kč");
  });
});

describe("handover checklist (B-006)", () => {
  const items = ["Odpadky", "Okna", "Voda"];
  it("records ticked items as done and the rest as skipped", () => {
    expect(buildChecklistState(items, [true, false, true])).toEqual({
      Odpadky: { state: "checked" },
      Okna: { state: "skipped" },
      Voda: { state: "checked" },
    });
  });
  it("can be saved with nothing ticked", () => {
    expect(checklistProgress(buildChecklistState(items, []))).toEqual({ done: 0, total: 3 });
  });
  it("counts done items, reading the old 'na' as skipped", () => {
    expect(
      checklistProgress({ A: { state: "checked" }, B: { state: "na" }, C: { state: "skipped" } }),
    ).toEqual({ done: 1, total: 3 });
    expect(checklistProgress(null)).toEqual({ done: 0, total: 0 });
  });
});

describe("expense settlement (B-009)", () => {
  it("an expense nobody else shares is not split, never 'settled'", () => {
    expect(expenseSettlement([])).toBe("not_split");
  });
  it("settled only when splits exist and all are paid back", () => {
    expect(expenseSettlement([{ paid_back: true }, { paid_back: true }])).toBe("settled");
    expect(expenseSettlement([{ paid_back: true }, { paid_back: false }])).toBe("unsettled");
  });
});

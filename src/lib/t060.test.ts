import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { countOk } from "./cottage-details";
import { fmtKcExact, isCompleteDate, isUuid, overlapPeakGuests } from "./data";

const stay = { start_date: "2026-11-13", end_date: "2026-11-15", guests: 7, status: "CONFIRMED" };

describe("overlapPeakGuests with a date being typed (T-060)", () => {
  it("does not throw on an empty or half-typed date", () => {
    expect(() => overlapPeakGuests("", "2026-11-15", [stay])).not.toThrow();
    expect(overlapPeakGuests("", "2026-11-15", [stay])).toBe(0);
    expect(overlapPeakGuests("2026-11-13", "", [stay])).toBe(0);
    expect(overlapPeakGuests("011020-11-05", "2026-11-15", [stay])).toBe(0);
  });
  it("still counts guests for whole dates", () => {
    expect(overlapPeakGuests("2026-11-14", "2026-11-16", [stay])).toBe(7);
  });
});

describe("isCompleteDate (T-060)", () => {
  it("takes real dates in 2000-2100 only", () => {
    expect(isCompleteDate("2026-11-20")).toBe(true);
    for (const v of ["", "0002-11-20", "0202-11-20", "2026-02-30", "2026-11", null, undefined])
      expect(isCompleteDate(v)).toBe(false);
  });
});

describe("isUuid (T-060)", () => {
  it("tells a row id from a cut-short link", () => {
    expect(isUuid("1f60d6a4-773b-42aa-b239-2e60b70f9977")).toBe(true);
    expect(isUuid("not-a-uuid")).toBe(false);
    expect(isUuid("1f60d6a4-773b-42aa-b239-2e60b70f99")).toBe(false);
  });
});

describe("countOk digits only (T-060)", () => {
  it("refuses forms that Number() reads as whole numbers", () => {
    for (const v of ["1e2", "0x10", "+5", "5.0", "1_0"]) expect(countOk(v, 500)).toBe(false);
    expect(countOk("12", 500)).toBe(true);
  });
});

describe("expense amounts to the heller (T-060)", () => {
  it("shows hellers when there are any", () => {
    expect(fmtKcExact(1250.5)).toBe("1 250,50 Kč");
    expect(fmtKcExact(333.34)).toBe("333,34 Kč");
    expect(fmtKcExact(300)).toBe("300 Kč");
  });
});

const src = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("screens (T-060 source checks)", () => {
  it("task detail no longer saves on every keystroke", () => {
    const page = src("routes/ukoly.$id.tsx");
    expect(page).not.toContain("onChange={(e) => update.mutate({ due_date");
    expect(page).toContain("function DueDateField");
  });
  it("checkout draft storage is guarded and keyed to the loaded cottage", () => {
    const page = src("routes/predani.tsx");
    expect(page).toContain("draftFor !== propertyId");
    expect(page).not.toMatch(/\n\s{4}localStorage\.setItem/);
  });
  it("guest booking link reuses an open link", () => {
    expect(src("routes/vice.tsx")).toContain('.is("revoked_at", null)');
  });
});

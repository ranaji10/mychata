import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { stayLength } from "@/lib/data";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("stay length in plain words (T-062, O-24)", () => {
  it("names a day visit and counts nights in both languages", () => {
    expect(stayLength("2026-11-13", "2026-11-13", "en")).toBe("Day visit (no overnight)");
    expect(stayLength("2026-11-13", "2026-11-13", "cs")).toBe("Jednodenní návštěva (bez přespání)");
    expect(stayLength("2026-11-13", "2026-11-14", "en")).toBe("1 night");
    expect(stayLength("2026-11-13", "2026-11-16", "cs")).toBe("3 noci");
    expect(stayLength("2026-11-13", "2026-11-18", "cs")).toBe("5 nocí");
    expect(stayLength("2026-11-13", "2026-11-14", "cs")).toBe("1 noc");
  });

  it("says nothing for half-typed or reversed dates", () => {
    expect(stayLength("", "2026-11-14", "en")).toBeNull();
    expect(stayLength("0002-11-13", "2026-11-14", "en")).toBeNull();
    expect(stayLength("2026-11-14", "2026-11-13", "en")).toBeNull();
  });

  it("crosses the October clock change without losing a night", () => {
    expect(stayLength("2026-10-24", "2026-10-26", "en")).toBe("2 nights");
  });
});

describe("0-night stays are allowed everywhere (O-24)", () => {
  it("the wording no longer says departure must be after arrival", () => {
    for (const path of [
      "../routes/rezervace.nova.tsx",
      "../routes/verejne.zadost.$token.tsx",
      "../lib/pending-booking.ts",
    ]) {
      const src = read(path);
      expect(src).not.toContain("must be after");
      expect(src).not.toContain("musí být po příjezdu");
    }
  });

  it("migration 0044 lets the public calendar take a day visit", () => {
    const sql = read("../../drizzle/migrations/0044_public_calendar_day_visits.sql");
    expect(sql).toContain("_end < _start");
    expect(sql).not.toContain("_end <= _start");
    expect(sql).toContain("revoke execute on function public.request_public_booking");
  });
});

describe("publishing the calendar asks first (O-23)", () => {
  it("Settings and Calendar show a confirmation before set_public_calendar(true)", () => {
    for (const path of ["../routes/vice.tsx", "../routes/kalendar.tsx"]) {
      const src = read(path);
      expect(src).toContain("setPublishAsk(true)");
      expect(src).toContain('"Publish the cottage calendar?"');
      expect(src.indexOf("setPublishAsk(true)")).toBeLessThan(
        src.indexOf('rpc("set_public_calendar", {'),
      );
    }
  });
});

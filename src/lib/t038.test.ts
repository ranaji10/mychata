// T-038: findings from the live test of 18 Oct 2026.
import { describe, expect, it } from "vitest";
import { localISO, manualCategoryLabel } from "@/lib/data";
import { calendarDaysUntil } from "@/lib/invites";
import { pageTitle } from "@/lib/page-title";

describe("invitation expiry in calendar days (F-17)", () => {
  const now = new Date(2026, 9, 17, 23, 0); // 17 Oct, 23:00 local

  it("a 7-day link made now says 7 days", () => {
    expect(calendarDaysUntil(new Date(2026, 9, 24, 23, 0).toISOString(), now)).toBe(7);
  });

  it("is 0 on the last day and negative after it", () => {
    expect(calendarDaysUntil(new Date(2026, 9, 17, 23, 30).toISOString(), now)).toBe(0);
    expect(calendarDaysUntil(new Date(2026, 9, 16, 12, 0).toISOString(), now)).toBe(-1);
  });
});

describe("page titles follow the language (F-17)", () => {
  it("gives Czech and English titles for app pages", () => {
    expect(pageTitle("/domu", "cs")).toBe("Domů — My Chata");
    expect(pageTitle("/domu", "en")).toBe("Home — My Chata");
    expect(pageTitle("/vydaje/vyrovnani", "en")).toBe("Settlement — My Chata");
    expect(pageTitle("/vydaje/", "cs")).toBe("Výdaje — My Chata");
  });

  it("matches routes with a parameter by prefix, but /rezervace/nova exactly", () => {
    expect(pageTitle("/rezervace/nova", "cs")).toBe("Nová rezervace — My Chata");
    expect(pageTitle("/rezervace/abc", "en")).toBe("Stay details — My Chata");
    expect(pageTitle("/verejne/zadost/x", "cs")).toBe("Žádost o pobyt — My Chata");
  });

  it("leaves unknown paths alone so the 404 page keeps its own title", () => {
    expect(pageTitle("/nic-takoveho", "cs")).toBeNull();
    expect(pageTitle("/", "cs")).toBe("My Chata — správa sdílené chaty");
  });
});

describe("local dates and manual categories (F-19)", () => {
  it("gives the local day just after midnight, not the UTC one", () => {
    expect(localISO(new Date(2026, 9, 18, 0, 30))).toBe("2026-10-18");
    expect(localISO(new Date(2026, 0, 1, 23, 59))).toBe("2026-01-01");
  });

  it("shows category codes as words in either language, any case", () => {
    expect(manualCategoryLabel("RULES", "cs")).toBe("Pravidla domu");
    expect(manualCategoryLabel("wifi", "en")).toBe("Wi-Fi");
    expect(manualCategoryLabel("emergency", "en")).toBe("Emergencies");
  });

  it("leaves an unknown category as it is", () => {
    expect(manualCategoryLabel("garden", "cs")).toBe("garden");
  });
});

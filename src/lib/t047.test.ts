// T-047: onboarding in a second tab, and lists that wait on another person (26 Oct 2026).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LIVE_REFRESH_MS } from "@/lib/guest-requests";

const src = (p: string) => readFileSync(p, "utf8");

describe("T-047: onboarding when the account already exists", () => {
  const s = src("src/routes/onboarding.tsx");

  it("shows 'all set up' to members who didn't ask for a new account", () => {
    expect(s).toContain(
      "(setUpElsewhere || memberships.length > 0) && !search.fresh && !search.kind",
    );
    expect(s).toContain('t("Nastavení je hotové", "You\'re all set up")');
  });

  it("checks again for an account just before creating one", () => {
    const finish = s.slice(s.indexOf("const finish = async"), s.indexOf("const canNext"));
    const check = finish.indexOf('.from("members")');
    const firstWrite = finish.indexOf('.from("profiles")');
    expect(check).toBeGreaterThan(-1);
    expect(check).toBeLessThan(firstWrite);
  });

  it("'Create my own account' from Add a cottage asks for a fresh account", () => {
    expect(src("src/routes/chata.nova.tsx")).toContain(
      '<Link to="/onboarding" search={{ fresh: true }}',
    );
  });
});

describe("T-047: requests refresh while visible (F-25)", () => {
  it("refreshes every 30 s", () => {
    expect(LIVE_REFRESH_MS).toBe(30_000);
  });

  for (const f of ["src/lib/guest-requests.ts", "src/components/PublicBookingRequest.tsx"])
    it(`${f} is never served stale`, () => {
      const s = src(f);
      expect(s).toContain("staleTime: 0");
      expect(s).toContain("refetchInterval: LIVE_REFRESH_MS");
    });
});

describe("T-047: Notifications show dates the Czech way", () => {
  it("no raw ISO dates in notification texts", () => {
    const s = src("src/lib/notification-list.ts");
    expect(s).not.toMatch(/\$\{\w+\.(start_date|end_date|due_date)\}/);
    expect(s).toContain("${fmtDate(b.start_date)} – ${fmtDate(b.end_date)}");
  });
});

describe("T-047: a way out of onboarding", () => {
  it("step 1 offers Sign out without an account and Cancel with one", () => {
    const s = src("src/routes/onboarding.tsx");
    expect(s).toContain('t("Odhlásit se", "Sign out")');
    expect(s).toContain('t("Zrušit", "Cancel")');
    expect(s).toMatch(/const \{ error \} = await supabase\.auth\.signOut\(\);\s+if \(error\)/);
  });
});

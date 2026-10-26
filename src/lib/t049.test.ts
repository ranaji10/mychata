// T-049: what Google Analytics may see (F-30), one page view per page (F-31), page names on the
// privacy page, and the small fixes from the 26 Oct test round.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ANALYTICS_PATH_JS, analyticsPath, trackPageView } from "@/lib/analytics";
import { mergeShares, pageLabel } from "@/lib/analytics-live.functions";

const src = (path: string) => readFileSync(join(__dirname, "..", "..", path), "utf8");

const CASES: [string, string][] = [
  ["/", "/"],
  ["/domu", "/domu"],
  ["/verejne/kalendar/SECRET123", "/verejne/kalendar/:token"],
  ["/verejne/manual/SECRET123", "/verejne/manual/:token"],
  ["/verejne/zadost/SECRET123", "/verejne/zadost/:token"],
  ["/host/SECRET123", "/host/:token"],
  ["/pozvanka/SECRET123", "/pozvanka/:token"],
  ["/pozvanka/SECRET123/extra/more", "/pozvanka/:token/extra"],
  ["/rezervace/nova", "/rezervace/nova"],
  ["/rezervace/0b5c-uuid", "/rezervace/:id"],
  ["/ukoly/0b5c-uuid", "/ukoly/:id"],
];

describe("F-30: page addresses for Google carry no tokens", () => {
  it.each(CASES)("%s → %s", (input, expected) => {
    expect(analyticsPath(input)).toBe(expected);
  });

  it("the head bootstrap applies the same rules", () => {
    for (const [input, expected] of CASES) {
      const run = new Function("location", `return ${ANALYTICS_PATH_JS};`);
      expect(run({ pathname: input })).toBe(expected);
    }
    const root = src("src/routes/__root.tsx");
    expect(root).toContain(
      "var lp=${ANALYTICS_PATH_JS};gtag('set',{page_location:location.origin+lp",
    );
    expect(root).toContain("send_page_view:false,page_location:location.origin+lp");
  });

  describe("trackPageView", () => {
    const w = globalThis as { window?: unknown };
    afterEach(() => {
      delete w.window;
    });
    it("sends and sets the cleaned address, never the query or the # part", () => {
      const calls: unknown[][] = [];
      w.window = {
        location: {
          origin: "https://mychata.cz",
          href: "https://mychata.cz/auth?x=1#access_token=SECRET&refresh_token=SECRET",
        },
        gtag: (...args: unknown[]) => calls.push(args),
      };
      trackPageView("/pozvanka/SECRET123", "Pozvánka");
      expect(JSON.stringify(calls)).not.toContain("SECRET");
      expect(calls[0]).toEqual([
        "set",
        { page_location: "https://mychata.cz/pozvanka/:token", page_path: "/pozvanka/:token" },
      ]);
      expect(calls[1]?.[1]).toBe("page_view");
    });
  });
});

describe("F-31: one page view per page", () => {
  it("skips a repeat of the same path (the router's first onResolved)", () => {
    const root = src("src/routes/__root.tsx");
    expect(root).toMatch(/if \(path === last\) return;/);
  });
});

describe("Privacy page: page names", () => {
  it("names the app's pages and never shows a raw path", () => {
    expect(pageLabel("/vice")).toEqual(["Nastavení", "Settings"]);
    expect(pageLabel("/profil")).toEqual(["Můj profil", "My profile"]);
    expect(pageLabel("/something-new")).toEqual(["Ostatní", "Other"]);
  });
  it("folds several Other rows into one, last", () => {
    expect(
      mergeShares([
        { label: ["Ostatní", "Other"], pct: 5 },
        { label: ["Domů", "Home"], pct: 40 },
        { label: ["Ostatní", "Other"], pct: 7 },
      ]),
    ).toEqual([
      { label: ["Domů", "Home"], pct: 40 },
      { label: ["Ostatní", "Other"], pct: 12 },
    ]);
  });
});

describe("Test round fixes", () => {
  it("sign-in and sign-up fields have a name, not only a placeholder (visible since T-050)", () => {
    const auth = src("src/routes/auth.tsx");
    expect(auth).toContain(
      '<span className="label-text">{t("Název organizace", "Organisation name")}</span>',
    );
    // The password label points at the field (htmlFor) so the eye button stays out of its name.
    expect(auth).toMatch(
      /<label htmlFor=\{passwordId\} className="label-text">\s*\{t\("Heslo", "Password"\)\}/,
    );
    expect(src("src/routes/reset-password.tsx")).toContain(
      '<span className="label-text">{t("E-mail", "Email")}</span>',
    );
  });
  it("Approvals no longer says 'family' bookings to organisations", () => {
    expect(src("src/routes/schvalovani.tsx")).not.toContain("Rodinné rezervace");
  });
  it("task translation logs a failed check instead of ignoring it", () => {
    const tt = src("src/lib/task-translation.functions.ts");
    expect(tt).toContain('console.error("[translate] feature_enabled"');
    expect(tt).toContain('console.error("[translate] bump_usage"');
  });
});

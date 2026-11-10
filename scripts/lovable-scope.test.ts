import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { globToRegExp, outOfScope, parseScope, report } from "./lovable-scope";

const scope33 = parseScope(
  JSON.stringify({
    prompt: "33-L",
    allow: [
      "drizzle/migrations/0051_*.sql",
      "drizzle/migrations/meta/0051_snapshot.json",
      "drizzle/migrations/meta/_journal.json",
      "src/integrations/supabase/types.ts",
    ],
  }),
);

describe("T-071: Lovable scope check", () => {
  it("globs: * stays in a folder, ** goes any depth", () => {
    expect(
      globToRegExp("drizzle/migrations/0051_*.sql").test("drizzle/migrations/0051_x.sql"),
    ).toBe(true);
    expect(globToRegExp("src/*.ts").test("src/lib/a.ts")).toBe(false);
    expect(globToRegExp("src/**").test("src/lib/a.ts")).toBe(true);
    expect(globToRegExp("src/**/*.tsx").test("src/routes/zadosti.tsx")).toBe(true);
    expect(
      globToRegExp("src/routes/verejne.zadost.$token.tsx").test(
        "src/routes/verejne.zadost.$token.tsx",
      ),
    ).toBe(true);
  });

  it("10 Nov (33-L): only the preview file is flagged, as a platform file", () => {
    const findings = outOfScope(
      [
        {
          sha: "667d010aaaa",
          subject: "Work in progress",
          files: [
            "src/integrations/supabase/previewAuthStorage.ts",
            "src/integrations/supabase/types.ts",
          ],
        },
        {
          sha: "648ec01bbbb",
          subject: "Changes",
          files: [
            "drizzle/migrations/0051_0051_apply_journaled_0050.sql",
            "drizzle/migrations/meta/0051_snapshot.json",
            "drizzle/migrations/meta/_journal.json",
          ],
        },
      ],
      scope33,
    );
    expect(findings).toEqual([
      {
        file: "src/integrations/supabase/previewAuthStorage.ts",
        commits: ["667d010aaaa"],
        platform: true,
      },
    ]);
    expect(report(findings, scope33, 2)).toContain("usually accepted");
  });

  it("app files and the scope file itself are flagged as not asked for", () => {
    const findings = outOfScope(
      [
        {
          sha: "c1",
          subject: "",
          files: [
            "src/routes/chaty.tsx",
            ".github/lovable-scope.json",
            "drizzle/migrations/0050_x.sql",
          ],
        },
      ],
      parseScope(
        JSON.stringify({ prompt: "x", allow: [".github/**", "drizzle/migrations/0051_*.sql"] }),
      ),
    );
    expect(findings.map((f) => [f.file, f.platform])).toEqual([
      [".github/lovable-scope.json", false],
      ["drizzle/migrations/0050_x.sql", false],
      ["src/routes/chaty.tsx", false],
    ]);
  });

  it("no scope file means nothing was asked for", () => {
    expect(parseScope(null)).toEqual({ prompt: null, allow: [] });
    expect(report([], parseScope(null), 0)).toContain("no prompt scope is set");
  });

  it("CI runs it only on Lovable's PR, outside the required check", () => {
    const ci = readFileSync(".github/workflows/ci.yml", "utf8");
    expect(ci).toMatch(/\n {2}lovable-scope:\n {4}if: github\.head_ref == 'lovable-sync'/);
    expect(ci).toContain("bun scripts/check-lovable-scope.ts origin/main");
    // The scope file must stay valid JSON whatever prompt it names (never assert its contents:
    // the PR that adds a prompt changes them, and this test runs in the required check).
    expect(() => parseScope(readFileSync(".github/lovable-scope.json", "utf8"))).not.toThrow();
  });
});

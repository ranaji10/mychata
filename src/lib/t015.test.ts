// T-015 (prompt CP-1, run 25 Oct 2026 as T-044): rules only the app enforces. CP-1 allows test
// files only, so rules that live inline are pinned by reading the source. The AI limits moved
// into src/lib/limits.ts in T-048.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AI_DAILY_LIMITS } from "@/lib/limits";
import { isPublicEmailDomain, PUBLIC_EMAIL_DOMAINS } from "@/lib/signup";

const src = (path: string) => readFileSync(join(__dirname, "..", "..", path), "utf8");

describe("T-015 rule 1: the consent choice expires", () => {
  const consent = src("src/lib/consent.tsx");
  it("after 12 months and when the version changes", () => {
    expect(consent).toMatch(/const CONSENT_VERSION = "v1";/);
    expect(consent).toMatch(/const TWELVE_MONTHS_MS = 1000 \* 60 \* 60 \* 24 \* 365;/);
    expect(consent).toMatch(
      /parsed\.version !== CONSENT_VERSION \|\| Date\.now\(\) - parsed\.at > TWELVE_MONTHS_MS/,
    );
  });
  it("the head bootstrap applies the same 12 months and version before gtag loads", () => {
    const root = src("src/routes/__root.tsx");
    expect(root).toContain("c.version==='v1'&&Date.now()-c.at<31536000000");
  });
});

describe("T-015 rule 2: institutions sign up with their own domain", () => {
  it("refuses the common public mailboxes, case-insensitively", () => {
    for (const domain of ["gmail.com", "seznam.cz", "email.cz", "centrum.cz", "outlook.com"]) {
      expect(PUBLIC_EMAIL_DOMAINS).toContain(domain);
      expect(isPublicEmailDomain(`Someone@${domain.toUpperCase()}`)).toBe(true);
    }
    expect(isPublicEmailDomain("spravce@spolek-priklad.cz")).toBe(false);
    expect(isPublicEmailDomain("not-an-email")).toBe(false);
  });
});

describe("T-015 rule 3: AI daily limits", () => {
  it("live in one file: 200 translations, 30 questions, 40 document reads a day per user", () => {
    expect(AI_DAILY_LIMITS).toEqual({
      taskTranslations: 200,
      manualQuestions: 30,
      documentReads: 40,
    });
  });
  it("are the numbers the server functions pass to bump_usage", () => {
    expect(src("src/lib/task-translation.functions.ts")).toMatch(
      /_daily_limit: AI_DAILY_LIMITS\.taskTranslations,/,
    );
    const qa = src("src/lib/manual-qa.functions.ts");
    expect(qa).toMatch(/_daily_limit: AI_DAILY_LIMITS\.manualQuestions/);
    expect(qa).toMatch(/_daily_limit: AI_DAILY_LIMITS\.documentReads/);
    // No second, inline copy of a limit.
    expect(qa).not.toMatch(/_daily_limit: \d/);
  });
});

describe("T-015 rule 4: analytics holding queue", () => {
  it("is gone: events go straight to gtag, which Consent Mode governs", () => {
    const analytics = src("src/lib/analytics.ts");
    expect(analytics).not.toMatch(/queue/i);
    expect(analytics).toMatch(/window\.gtag\?\.\("event"/);
  });
});

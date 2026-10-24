// T-015 (prompt CP-1, run 25 Oct 2026 as T-044): rules only the app enforces. CP-1 allows test
// files only, so rules that live inline are pinned by reading the source; moving them into one
// limits file (the brief's refactor) is left for a code task.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
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
  it("task translation is capped at 200 a day per user", () => {
    expect(src("src/lib/task-translation.functions.ts")).toMatch(/_daily_limit: 200,/);
  });
  it("manual questions and document reads use named limits", () => {
    const qa = src("src/lib/manual-qa.functions.ts");
    expect(qa).toMatch(/const DAILY_QUESTIONS_PER_USER = 30;/);
    expect(qa).toMatch(/const DAILY_DOCUMENT_READS_PER_USER = 40;/);
    expect(qa).toMatch(/_daily_limit: DAILY_QUESTIONS_PER_USER/);
    expect(qa).toMatch(/_daily_limit: DAILY_DOCUMENT_READS_PER_USER/);
  });
});

describe("T-015 rule 4: analytics holding queue", () => {
  it("is gone: events go straight to gtag, which Consent Mode governs", () => {
    const analytics = src("src/lib/analytics.ts");
    expect(analytics).not.toMatch(/queue/i);
    expect(analytics).toMatch(/window\.gtag\?\.\("event"/);
  });
});

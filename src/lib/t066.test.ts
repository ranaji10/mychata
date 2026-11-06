// T-066: O-32 (forms say what the server would refuse) and the sync workflow that opens the
// lovable-sync -> main PR by itself.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  EMAIL_PATTERN,
  GUEST_LIMITS,
  QUESTION_MAX,
  guestRequestProblem,
  isInputRefusal,
  serverErrorText,
} from "@/lib/form-checks";
import { askManualInput, guestRequestInput } from "@/lib/input-schemas";

const t = (_cs: string, en: string) => en;

describe("the browser checks match the server's zod rules", () => {
  it("the e-mail pattern is zod's own", () => {
    expect(String(EMAIL_PATTERN)).toBe(String(z.regexes.email));
  });

  const base = { name: "Jana Nováková", email: "jana@example.org", guests: 2, note: "" };
  const samples: Partial<typeof base>[] = [
    {},
    { email: "jan@seznam" },
    { email: "petr.novak+chata@seznam.cz" },
    { email: "Jana.Novakova@Centrum.CZ" },
    { email: "jan..novak@seznam.cz" },
    { email: "jan@seznam.c" },
    { email: "jiří@seznam.cz" },
    { email: `${"a".repeat(190)}@example.org` },
    { name: "J" },
    { name: "x".repeat(GUEST_LIMITS.name + 1) },
    { guests: 0 },
    { guests: 51 },
    { guests: 1.5 },
    { note: "x".repeat(GUEST_LIMITS.note) },
    { note: "x".repeat(GUEST_LIMITS.note + 1) },
  ];
  it.each(samples.map((s) => [JSON.stringify(s).slice(0, 60), s] as const))(
    "%s: same verdict",
    (_label, change) => {
      const input = { ...base, ...change };
      const server = guestRequestInput.safeParse({
        token: "a".repeat(32),
        startDate: "2026-12-01",
        endDate: "2026-12-02",
        name: input.name.trim(),
        email: input.email.trim(),
        guests: input.guests,
        note: input.note || undefined,
      }).success;
      expect(guestRequestProblem(input) === null).toBe(server);
    },
  );

  it("names the field to fix", () => {
    expect(guestRequestProblem({ ...base, email: "jan@seznam" })).toBe("email");
    expect(guestRequestProblem({ ...base, name: " J " })).toBe("name");
    expect(guestRequestProblem({ ...base, note: "x".repeat(1001) })).toBe("note");
    expect(guestRequestProblem({ ...base, guests: 0 })).toBe("guests");
  });

  it("the manual box stops at the server's question limit", () => {
    const q = (question: string) =>
      askManualInput.safeParse({
        propertyId: "3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90",
        question,
        lang: "cs",
      }).success;
    expect(q("x".repeat(QUESTION_MAX))).toBe(true);
    expect(q("x".repeat(QUESTION_MAX + 1))).toBe(false);
    expect(readFileSync("src/components/AskBox.tsx", "utf8")).toContain("maxLength={QUESTION_MAX}");
  });
});

describe("a refusal that reaches the browser is said in words", () => {
  const refusal = (() => {
    const r = askManualInput.safeParse({ propertyId: "x", question: "?", lang: "de" });
    return r.success ? null : new Error(r.error.message);
  })();

  it("a ZodError's message is recognised", () => {
    expect(refusal).not.toBeNull();
    expect(isInputRefusal(refusal)).toBe(true);
    expect(serverErrorText(refusal, t)).not.toMatch(/[[{]/);
    expect(serverErrorText(refusal, t)).toMatch(/doesn't fit/);
  });

  it("other errors keep their message", () => {
    expect(isInputRefusal(new Error("Failed to fetch"))).toBe(false);
    expect(isInputRefusal(new Error("[not json"))).toBe(false);
    expect(serverErrorText(new Error("Failed to fetch"), t)).toBe("Failed to fetch");
  });

  it("the guest form checks first, catches, and always ends busy", () => {
    const src = readFileSync("src/routes/host.$token.tsx", "utf8");
    expect(src).toContain("guestRequestProblem(");
    expect(src).toMatch(/catch \(error\)[\s\S]*?isInputRefusal\(error\)/);
    expect(src).toMatch(/finally \{\s*setBusy\(false\);/);
    expect(src).toContain("maxLength={GUEST_LIMITS.note}");
    expect(src).not.toContain('email.includes("@")');
  });
});

describe("sync workflow (lovable-sync -> main PR)", () => {
  const wf = readFileSync(".github/workflows/sync-lovable.yml", "utf8");
  const script = readFileSync("scripts/sync-lovable.sh", "utf8");
  const ci = readFileSync(".github/workflows/ci.yml", "utf8");

  it("runs on pushes to both branches with the rights it needs", () => {
    expect(wf).toMatch(/branches: \[main, lovable-sync\]/);
    expect(wf).toMatch(/pull-requests: write/);
    expect(wf).toMatch(/actions: write/);
    expect(wf).toContain("scripts/sync-lovable.sh");
  });

  it("never force-pushes; opens the PR once; starts CI for what it pushed or opened", () => {
    expect(script).not.toMatch(/--force|\s-f\s+origin|\+refs/);
    expect(script).toContain("gh pr list --base");
    expect(script).toContain("gh pr create");
    expect(script).toContain("gh workflow run ci.yml --ref");
  });

  it("CI can check only the changed files when started that way", () => {
    expect(ci).toContain("changed_only:");
    expect(ci).toContain("github.event_name == 'pull_request' || inputs.changed_only");
    expect(ci).toContain("github.event_name == 'workflow_dispatch' && !inputs.changed_only");
  });
});

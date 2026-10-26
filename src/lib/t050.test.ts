// T-050 (D-32, 26 Oct): visible labels above form fields, and the sign-up button says what is
// missing. Pinned by reading the source (no DOM in the test runner).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const src = (path: string) => readFileSync(join(__dirname, "..", "..", path), "utf8");

const FILES = [
  "src/routes/auth.tsx",
  "src/routes/reset-password.tsx",
  "src/routes/host.$token.tsx",
  "src/components/PublicBookingRequest.tsx",
  "src/routes/chata.nova.tsx",
  "src/routes/onboarding.tsx",
  "src/components/CottageSetup.tsx",
  "src/components/InstitutionSetup.tsx",
  "src/routes/manual.tsx",
  "src/routes/dokumenty.tsx",
  "src/routes/chaty.tsx",
];

/** Text inputs, textareas and selects that are neither inside a <label> nor named otherwise. */
function unlabelled(source: string): string[] {
  const found: string[] = [];
  const re = /<(input|textarea|select|PasswordInput)\b([\s\S]*?)(\/>|(?<!=)>)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    const attrs = m[2] ?? "";
    if (/type="(hidden|file|checkbox|radio|date)"/.test(attrs)) continue;
    if (/className="hidden"/.test(attrs)) continue;
    if (/aria-label=|aria-labelledby=|\bid=/.test(attrs)) continue;
    const before = source.slice(0, m.index);
    if (before.lastIndexOf("<label") > before.lastIndexOf("</label>")) continue;
    found.push(attrs.replace(/\s+/g, " ").slice(0, 80));
  }
  return found;
}

describe("D-32: every field in these forms has a label", () => {
  it.each(FILES)("%s", (file) => {
    expect(unlabelled(src(file))).toEqual([]);
  });
  it("no label nested in another label", () => {
    for (const file of FILES) {
      let depth = 0;
      for (const line of src(file).split("\n")) {
        const opens = (line.match(/<label\b/g) ?? []).length;
        if (opens) expect(depth, file).toBe(0);
        depth += opens - (line.match(/<\/label>/g) ?? []).length;
      }
    }
  });
});

describe("D-32: the sign-up button says what is missing", () => {
  it("lists the missing fields once someone has started typing", () => {
    const auth = src("src/routes/auth.tsx");
    expect(auth).toContain('t("Ještě doplňte: ", "Still to fill in: ")');
    expect(auth).toMatch(/startedTyping && missing\.length > 0/);
  });
});

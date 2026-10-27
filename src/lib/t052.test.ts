import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { firstLoadError } from "./load-error";

const src = (path: string) => readFileSync(join(__dirname, "..", "..", path), "utf8");
const boom = new Error("read failed");

describe("T-052 no blank or empty screen after a failed or hanging read", () => {
  it("a failed read with nothing cached is shown", () => {
    expect(firstLoadError([[boom, true]])).toBe(boom);
  });
  it("a failed refetch with data still cached is not", () => {
    expect(firstLoadError([[boom, false]])).toBeNull();
  });
  it("no error, no error screen", () => {
    expect(firstLoadError([[null, true]])).toBeNull();
  });
  it("the first failing read wins", () => {
    const other = new Error("other");
    expect(
      firstLoadError([
        [null, true],
        [other, true],
        [boom, true],
      ]),
    ).toBe(other);
  });
  it("the account context reports accounts, cottages and members read errors", () => {
    const account = src("src/lib/account.tsx");
    for (const name of ["accountsError", "propertiesError", "membersError"]) {
      expect(account).toContain(name);
    }
    expect(account).toMatch(/loadError: firstLoadError\(/);
  });
  it("the app shell shows Try again for them and a way out after 10 s", () => {
    const shell = src("src/components/AppShell.tsx");
    expect(shell).toContain("loadError");
    expect(shell).toContain("SLOW_AFTER_MS = 10000");
    expect(shell).toContain('signInAgain("app")');
    expect(shell).toContain("disabled={retrying}");
  });
  it("password fields are named by their own label, not the eye button", () => {
    const form = src("src/components/SetPasswordForm.tsx");
    expect(form.match(/htmlFor=\{(currentId|newId|againId)\}/g)).toHaveLength(3);
    expect(form).not.toMatch(/<label className="block">/);
  });
  it("the documents filter has a name", () => {
    expect(src("src/routes/dokumenty.tsx")).toMatch(
      /aria-label=\{t\("Filtrovat podle názvu", "Filter by title"\)\}/,
    );
  });
});

// T-046: requests of 26 Oct 2026 (Enter submits, Help & support, a way back from Privacy,
// no embeddings on save).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { pageTitle } from "@/lib/page-title";
import { isSettingsPath, SETTINGS_LINKS } from "@/lib/settings-nav";

const src = (p: string) => readFileSync(p, "utf8");

describe("T-046: Enter submits sign-in, sign-up and password forms", () => {
  for (const file of [
    "src/routes/auth.tsx",
    "src/routes/reset-password.tsx",
    "src/components/SetPasswordForm.tsx",
  ]) {
    it(`${file} wraps its fields in a form with a submit button`, () => {
      const s = src(file);
      expect(s).toMatch(/<form[\s\S]*?onSubmit=/);
      expect(s).toMatch(/e\.preventDefault\(\)/);
      expect(s).toContain('type="submit"');
    });
  }

  it("only the submit button sits inside the sign-in form", () => {
    const s = src("src/routes/auth.tsx");
    const form = s.slice(s.indexOf("<form"), s.indexOf("</form>"));
    expect(form.match(/<Button/g)?.length).toBe(1);
  });
});

describe("T-046: Help & support", () => {
  it("is listed under Settings and keeps the Settings tab lit", () => {
    expect(SETTINGS_LINKS.some((l) => l.to === "/pomoc")).toBe(true);
    expect(isSettingsPath("/pomoc")).toBe(true);
    expect(src("src/routes/vice.tsx")).toContain('to="/pomoc"');
    expect(pageTitle("/pomoc", "cs")).toBe("Nápověda a podpora — My Chata");
    expect(pageTitle("/pomoc", "en")).toBe("Help & support — My Chata");
  });

  it("offers the support address and a problem report without personal data", () => {
    const s = src("src/routes/pomoc.tsx");
    expect(s).toContain('SUPPORT_EMAIL = "podpora@mychata.cz"');
    expect(s).toContain("mailto:${SUPPORT_EMAIL}");
    expect(s).not.toMatch(/user\.email|display_name/);
  });
});

describe("T-046: a way back from Privacy & cookies", () => {
  it("shows Back for everyone, with a fallback when there is no history", () => {
    const s = src("src/routes/soukromi.tsx");
    expect(s).not.toMatch(/\{user \? \(\s*<Link/);
    expect(s).toContain("router.history.canGoBack()");
    expect(s).toContain('user ? "/vice" : "/auth"');
  });

  it("the banner links with the router and a reopened banner can be closed", () => {
    const s = src("src/lib/consent.tsx");
    expect(s).toContain('<Link to="/soukromi"');
    expect(s).not.toContain('<a href="/soukromi"');
    expect(s).toContain("canDismiss");
    expect(s).toMatch(/dismiss: \(\) => \{\s*if \(!previous\) return;/);
  });
});

describe("T-046: ADR-0012, no embeddings on save", () => {
  it("no page calls rebuildManualChunks", () => {
    for (const f of ["src/routes/manual.tsx", "src/routes/chaty.tsx"])
      expect(src(f)).not.toContain("rebuildManualChunks(");
  });

  it("askManual logs the context size without text", () => {
    const s = src("src/lib/manual-qa.functions.ts");
    expect(s).toContain('"[askManual] context size"');
  });
});

describe("T-046: admins see the requester's note before deciding", () => {
  it("Home's request card shows the note", () => {
    expect(src("src/routes/domu.tsx")).toContain("{g.note && ");
  });
});

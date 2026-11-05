import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync(new URL("../routes/verejne.zadost.$token.tsx", import.meta.url), "utf8");

describe("public request form back arrow (T-061)", () => {
  it("goes back only when there is an app page to return to", () => {
    expect(page).toContain("useCanGoBack()");
    expect(page).toContain("{canGoBack && (");
    expect(page).toContain("router.history.back()");
    expect(page).toContain('t("Zpět", "Back")');
  });
});

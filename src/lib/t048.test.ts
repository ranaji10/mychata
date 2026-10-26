// T-048: the language choice no longer breaks hydration (F-29), and the AI limits are in one file.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { LanguageProvider, SERVER_LANG, useLang } from "@/lib/i18n";

const src = (path: string) => readFileSync(join(__dirname, "..", "..", path), "utf8");

function Greeting() {
  const { t } = useLang();
  return createElement("p", null, t("Otevírám vaši chatu", "Opening your cottage"));
}

describe("F-29: hydration starts from the server's language", () => {
  const original = (globalThis as { localStorage?: unknown }).localStorage;
  afterEach(() => {
    (globalThis as { localStorage?: unknown }).localStorage = original;
  });

  it("renders Czech for hydration even when English is stored", () => {
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (key: string) => (key === "mychata.lang" ? "en" : null),
      setItem: () => {},
      removeItem: () => {},
    };
    // renderToString uses the same snapshot React uses for the first client (hydration)
    // render, so it must match what the server sent.
    const html = renderToString(createElement(LanguageProvider, null, createElement(Greeting)));
    expect(SERVER_LANG).toBe("cs");
    expect(html).toContain("Otevírám vaši chatu");
  });

  it("reads the stored language through useSyncExternalStore, not in the first render", () => {
    const i18n = src("src/lib/i18n.tsx");
    expect(i18n).toMatch(
      /useSyncExternalStore\(subscribeLang, readStoredLang, \(\) => SERVER_LANG\)/,
    );
    expect(i18n).not.toMatch(/useState<Lang>\(\(\) =>/);
  });
});

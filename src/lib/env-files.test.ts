// B-018: Lovable's editor preview runs the development server, which reads .env.development
// but not .env.production. Both files must carry the same public browser values, or the
// preview (or the published site) starts without the Supabase address and shows
// "This page didn't load".
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function viteValues(file: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = /^(VITE_[A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (m?.[1] !== undefined) out[m[1]] = m[2] ?? "";
  }
  return out;
}

describe("public build values (B-018)", () => {
  const production = viteValues(".env.production");
  const development = viteValues(".env.development");

  it("the production file has the Supabase address and publishable key", () => {
    expect(production["VITE_SUPABASE_URL"]).toMatch(/^https:\/\/[a-z0-9]+\.supabase\.co$/);
    expect(production["VITE_SUPABASE_PUBLISHABLE_KEY"]).toBeTruthy();
  });

  it("the development file (Lovable preview) has exactly the same values", () => {
    expect(development).toEqual(production);
  });

  it("neither file holds a secret", () => {
    for (const values of [production, development]) {
      for (const [key, value] of Object.entries(values)) {
        expect(key).not.toMatch(/SERVICE_ROLE|SECRET|LOVABLE_API_KEY/);
        expect(value).not.toMatch(/^sb_secret_/);
      }
    }
  });
});

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: {} } }));

const { signOutHere } = await import("./sign-out");

type Scope = "global" | "local" | "others" | undefined;

/** A fake auth client that behaves like supabase-js 2.119 (global failure keeps the session). */
function fakeAuth(opts: { globalFails?: boolean; localFails?: boolean; localKeeps?: boolean }) {
  let session: object | null = { user: "u1" };
  const calls: Scope[] = [];
  return {
    calls,
    auth: {
      async signOut(o?: { scope?: "global" | "local" | "others" }) {
        const scope = o?.scope;
        calls.push(scope);
        if ((scope ?? "global") === "global") {
          if (opts.globalFails) return { error: { message: "503" } };
          session = null;
          return { error: null };
        }
        if (!opts.localKeeps) session = null;
        return { error: opts.localFails ? { message: "offline" } : null };
      },
      async getSession() {
        return { data: { session } };
      },
    },
  };
}

describe("sign out (T-068)", () => {
  it("signs out everywhere when the server answers", async () => {
    const f = fakeAuth({});
    expect(await signOutHere("test", f.auth)).toEqual({ error: null });
    expect(f.calls).toEqual([undefined]);
  });

  it("still signs out this device when the server fails", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const f = fakeAuth({ globalFails: true, localFails: true });
    expect(await signOutHere("test", f.auth)).toEqual({ error: null });
    expect(f.calls).toEqual([undefined, "local"]);
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });

  it("reports an error only when a session is still there", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const f = fakeAuth({ globalFails: true, localKeeps: true });
    const result = await signOutHere("test", f.auth);
    expect(result.error?.message).toBe("503");
    err.mockRestore();
  });

  it("no screen calls the raw global sign-out", () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.tsx?$/.test(name) && !name.endsWith(".test.ts")) files.push(p);
      }
    };
    walk("src");
    const offenders = files.filter((p) => /auth\.signOut\(\s*\)/.test(readFileSync(p, "utf8")));
    expect(offenders.filter((p) => !p.endsWith("sign-out.ts"))).toEqual([]);
  });
});

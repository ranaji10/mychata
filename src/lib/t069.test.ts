import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: {} } }));

const { signOutHere } = await import("./sign-out");

const read = (p: string) => readFileSync(p, "utf8");

describe("T-069: public-calendar requests and institutions", () => {
  it("an institution admin can switch off a public calendar that is on", () => {
    const s = read("src/routes/vice.tsx");
    expect(s).toMatch(
      /\{!isFamily && isAdmin && property\?\.public_calendar_enabled && \(\s*<SettingsRow[\s\S]{0,200}setStopOpen\(true\)/,
    );
    // The family wording points to a button institutions don't have.
    expect(s).toMatch(/isFamily\s*\?\s*t\(\s*"Odkaz, který jste sdíleli/);
  });

  it("the Home tile counts requests from the public calendar", () => {
    const s = read("src/routes/domu.tsx");
    expect(s).toMatch(
      /pendingTotal = pendingRequests\.length \+ \(guestRequests\?\.length \?\? 0\)/,
    );
    expect(s).toMatch(/value=\{pendingTotal\}/);
    // guestRequests is declared before it is used.
    expect(s.indexOf("usePendingGuestRequests(property?.id, isAdmin)")).toBeLessThan(
      s.indexOf("const pendingTotal"),
    );
  });

  it("Requests points to Home when public-calendar requests wait", () => {
    const s = read("src/routes/zadosti.tsx");
    expect(s).toMatch(/usePendingGuestRequests\(property\?\.id, isAdmin\)/);
    expect(s).toMatch(/guestPending > 0 &&[\s\S]{0,120}to="\/domu"/);
  });

  it("sign-out survives a local sign-out that throws (auth-js 2.119)", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    let session: object | null = { user: "u1" };
    const auth = {
      async signOut(o?: { scope?: "global" | "local" | "others" }) {
        if ((o?.scope ?? "global") === "global") return { error: { message: "offline" } };
        session = null; // removed first, then the listener's error is rethrown
        throw new Error("listener failed");
      },
      async getSession() {
        return { data: { session } };
      },
    };
    expect(await signOutHere("test", auth)).toEqual({ error: null });
    err.mockRestore();
  });
});

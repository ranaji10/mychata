import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: {} } }));

const { signOutHere } = await import("./sign-out");
const { buildNotifications } = await import("./notification-list");

const read = (p: string) => readFileSync(p, "utf8");

describe("T-069: every booking request on Requests, public ones marked", () => {
  it("Requests is open to family admins and lists public requests first", () => {
    const s = read("src/routes/zadosti.tsx");
    expect(s).not.toContain("useInstitutionOnly");
    expect(s.indexOf("<PublicRequests />")).toBeGreaterThan(0);
    expect(s.indexOf("<PublicRequests />")).toBeLessThan(s.indexOf("heldBookings.map"));
    expect(s).toMatch(/enabled: !!property && isFamily && isAdmin/);
    expect(s).toMatch(/enabled: !!property && !isFamily && isAdmin/);
  });

  it("public requests have their own look and badge", () => {
    const s = read("src/components/PublicRequests.tsx");
    expect(s).toContain("border-public bg-public-soft");
    expect(s).toMatch(/<PillPublic>[\s\S]{0,120}"Veřejná žádost", "Public request"/);
    // The decision and the invite offer moved with the cards.
    expect(s).toContain('supabase.rpc("decide_guest_request"');
    expect(s).toContain("setInviteOffer(visitor)");
    expect(read("src/styles.css")).toMatch(/--public: #5b3fa6;/);
  });

  it("Home only links to Requests and counts what waits", () => {
    const s = read("src/routes/domu.tsx");
    expect(s).not.toContain("decide_guest_request");
    expect(s).not.toContain("heldBookings.map");
    expect(s).toMatch(/data-testid="home-requests-card"[\s\S]{0,40}|to="\/zadosti"/);
    expect(s).toMatch(/pendingTotal = pendingRequests\.length \+ publicPending/);
    expect(s).toMatch(/value=\{pendingTotal\}/);
  });

  it("notifications about public requests open Requests", () => {
    const g = {
      id: "g1",
      guest_name: "Eva",
      start_date: "2026-12-01",
      end_date: "2026-12-03",
      created_at: "2026-11-09T10:00:00Z",
      source: "public_calendar",
    };
    const items = buildNotifications({
      isFamily: true,
      isAdmin: true,
      hasName: true,
      members: [],
      today: "2026-11-09",
      guestRequests: [g],
      decidedGuestRequests: [
        { ...g, id: "g2", status: "DECLINED", decided_at: "2026-11-09T11:00:00Z" },
      ],
    } as unknown as Parameters<typeof buildNotifications>[0]);
    expect(items.find((n) => n.key === "guest:g1")?.to).toBe("/zadosti");
    expect(items.find((n) => n.key === "guest-decided:g2")?.to).toBe("/zadosti");
  });

  it("Settings offers institutions no public calendar", () => {
    const s = read("src/routes/vice.tsx");
    expect(s).not.toMatch(/!isFamily && isAdmin && property\?\.public_calendar_enabled/);
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

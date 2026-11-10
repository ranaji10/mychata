import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: {} } }));

const { familyProcessed } = await import("./guest-requests");

const guest = (over: Record<string, unknown>) => ({
  id: "g1",
  guest_name: "Eva",
  start_date: "2026-11-26",
  end_date: "2026-11-28",
  status: "DECLINED",
  source: "public_calendar",
  decided_at: "2026-11-10T09:00:00Z",
  ...over,
});
const booking = (over: Record<string, unknown>) => ({
  id: "b1",
  requester_name: "Jana",
  requester_member_id: "m1",
  start_date: "2026-12-01",
  end_date: "2026-12-03",
  status: "CONFIRMED",
  auto_approved: false,
  approved_at: "2026-11-09T09:00:00Z",
  ...over,
});

describe("T-070: processed requests for families", () => {
  it("lists decided public requests and approved held member stays, newest first", () => {
    const rows = familyProcessed(
      [
        guest({}),
        guest({
          id: "g2",
          status: "APPROVED",
          source: "guest_link",
          decided_at: "2026-11-08T09:00:00Z",
        }),
      ],
      [booking({})],
    );
    expect(rows.map((r) => [r.id, r.status, r.origin])).toEqual([
      ["guest:g1", "DECLINED", "public_calendar"],
      ["booking:b1", "APPROVED", "member"],
      ["guest:g2", "APPROVED", "guest_link"],
    ]);
    expect(rows[1]?.bookingId).toBe("b1");
  });

  it("leaves out stays nobody decided, auto-approved stays and stays made from a public request", () => {
    const rows = familyProcessed(
      [],
      [
        booking({ id: "pending", status: "PENDING", approved_at: null }),
        booking({ id: "own", auto_approved: true }),
        booking({ id: "fromGuest", requester_member_id: null }),
        booking({ id: "old", approved_at: null }),
      ],
    );
    expect(rows).toEqual([]);
  });

  it("keeps the 20 most recent", () => {
    const many = Array.from({ length: 25 }, (_, i) =>
      guest({ id: `g${i}`, decided_at: `2026-10-${String(i + 1).padStart(2, "0")}T00:00:00Z` }),
    );
    const rows = familyProcessed(many, []);
    expect(rows).toHaveLength(20);
    expect(rows[0]?.id).toBe("guest:g24");
  });

  it("the family page shows the list and hides the empty state while it has rows", () => {
    const s = readFileSync("src/routes/zadosti.tsx", "utf8");
    expect(s).toContain('data-testid="family-processed"');
    expect(s).toMatch(
      /decidedGuests &&\s*publicCount === 0 &&\s*familyDone\.length === 0 && \(\s*<EmptyState/,
    );
    expect(s).toContain('t("pobyt člena", "member\'s stay")');
  });
});

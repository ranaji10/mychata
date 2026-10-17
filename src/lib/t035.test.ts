// T-035: bugs reported on 17 Oct 2026.
import { describe, expect, it } from "vitest";
import { accountContextLine, sameName } from "@/lib/account-label";
import { centreSquare } from "@/lib/avatar";
import { missingCottageDetails } from "@/lib/cottage-details";
import { daysUntil, groupInvitations, type InvitationRow } from "@/lib/invites";
import { captureRecoveryFromUrl, hasPassword } from "@/lib/password";
import { isStaleChunkError } from "@/lib/stale-chunk";

const en = (_cs: string, en: string) => en;

describe("header line (bugs 2 and 13)", () => {
  it("hides the account name when it repeats the cottage name", () => {
    expect(
      accountContextLine(
        { type: "FAMILY", name: "Testing with Gemini" },
        "Testing with Gemini ",
        en,
      ),
    ).toBeNull();
    expect(accountContextLine({ type: "FAMILY", name: "Rodina Novák" }, "Chata Lipno", en)).toBe(
      "Rodina Novák",
    );
  });

  it("marks an organisation, so an email-like name isn't read as the sign-in", () => {
    expect(
      accountContextLine(
        { type: "INSTITUTIONAL", name: "r.parmar@veeam.com" },
        "Hawai cottage",
        en,
      ),
    ).toBe("Organisation · r.parmar@veeam.com");
    expect(accountContextLine({ type: "INSTITUTIONAL", name: "Klub" }, "klub", en)).toBe(
      "Organisation",
    );
    expect(sameName(" A ", "a")).toBe(true);
  });
});

describe("finish setting up (bug 8)", () => {
  const base = {
    address: "Lesní 1",
    city: "Jičín",
    rooms: 5,
    peak_seasons: ["summer"],
    overlap_max_guests: null,
  };
  it("'No' to overlapping stays is an answer, not a gap", () => {
    expect(missingCottageDetails({ ...base, overlap_allowed: false }, true)).toEqual([]);
    expect(missingCottageDetails({ ...base, overlap_allowed: null }, true)).toEqual(["overlap"]);
    expect(missingCottageDetails({ ...base, overlap_max_guests: 6 }, true)).toEqual([]);
  });
  it("never asks for house rules; small cottages never get the overlap question", () => {
    expect(missingCottageDetails({ ...base, rooms: 2 }, false)).toEqual(["photo"]);
  });
});

describe("invitation batches (bugs 10–12)", () => {
  const now = new Date("2026-10-17T12:00:00Z");
  const row = (over: Partial<InvitationRow>): InvitationRow => ({
    id: Math.random().toString(36),
    email: "a@example.com",
    role: "MEMBER",
    token: Math.random().toString(36),
    group_token: null,
    status: "PENDING",
    created_at: "2026-10-15T10:00:00Z",
    expires_at: "2026-10-22T10:00:00Z",
    created_by_member_id: "m1",
    ...over,
  });

  it("groups by group link, and older rows by the moment they were made", () => {
    const batches = groupInvitations(
      [
        row({ email: "b@example.com", group_token: "g1" }),
        row({ email: "a@example.com", group_token: "g1", status: "ACCEPTED" }),
        row({
          email: "c@example.com",
          created_at: "2026-10-01T10:00:00Z",
          expires_at: "2026-10-08T10:00:00Z",
        }),
        row({
          email: "d@example.com",
          created_at: "2026-10-01T10:00:00Z",
          expires_at: "2026-10-08T10:00:00Z",
        }),
      ],
      now,
    );
    expect(batches).toHaveLength(2);
    const [fresh, old] = batches;
    expect(fresh!.groupToken).toBe("g1");
    expect(fresh!.state).toBe("active");
    expect(fresh!.accepted.map((r) => r.email)).toEqual(["a@example.com"]);
    expect(fresh!.pending.map((r) => r.email)).toEqual(["b@example.com"]);
    expect(old!.state).toBe("expired");
    expect(old!.expired).toHaveLength(2);
  });

  it("a batch where everyone joined is closed; admin role is kept", () => {
    const [b] = groupInvitations(
      [row({ group_token: "g2", status: "ACCEPTED", role: "ADMIN" })],
      now,
    );
    expect(b!.state).toBe("closed");
    expect(b!.admin).toBe(true);
  });

  it("counts whole days left", () => {
    expect(daysUntil("2026-10-22T10:00:00Z", now)).toBe(4);
    expect(daysUntil("2026-10-17T10:00:00Z", now)).toBe(-1);
  });
});

describe("passwords (bugs 4 and 4a)", () => {
  it("a Google-only sign-up has no password until one is set", () => {
    expect(
      hasPassword({
        identities: [{ provider: "google" }] as never,
        app_metadata: { providers: ["google"] },
        user_metadata: {},
      }),
    ).toBe(false);
    expect(
      hasPassword({
        identities: [{ provider: "google" }] as never,
        app_metadata: { providers: ["google"] },
        user_metadata: { password_set: true },
      }),
    ).toBe(true);
    expect(
      hasPassword({
        identities: [{ provider: "email" }] as never,
        app_metadata: {},
        user_metadata: {},
      }),
    ).toBe(true);
    expect(hasPassword(null)).toBe(false);
  });

  it("recognises the reset link's address", () => {
    expect(
      captureRecoveryFromUrl(
        "https://mychata.cz/auth#access_token=x&type=recovery&expires_in=3600",
      ),
    ).toBe(true);
    expect(captureRecoveryFromUrl("https://mychata.cz/auth#access_token=x&type=signup")).toBe(
      false,
    );
    expect(captureRecoveryFromUrl("https://mychata.cz/domu")).toBe(false);
  });
});

describe("stale page code after a release (bug 1)", () => {
  it("recognises each browser's message", () => {
    expect(isStaleChunkError(new TypeError("Importing a module script failed."))).toBe(true);
    expect(
      isStaleChunkError(
        new TypeError("Failed to fetch dynamically imported module: https://x/a.js"),
      ),
    ).toBe(true);
    expect(isStaleChunkError(new Error("error loading dynamically imported module"))).toBe(true);
    expect(isStaleChunkError(new Error("Cannot read properties of undefined"))).toBe(false);
  });
});

describe("profile photo (bug 6)", () => {
  it("crops the centre square", () => {
    expect(centreSquare(400, 300)).toEqual({ sx: 50, sy: 0, side: 300 });
    expect(centreSquare(300, 500)).toEqual({ sx: 0, sy: 100, side: 300 });
  });
});

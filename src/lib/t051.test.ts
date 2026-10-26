import { describe, expect, it } from "vitest";
import { startTarget } from "./start-target";

const base = { hasAccount: false, loading: false, signedIn: true, needsOnboarding: false };

describe("T-051 start screen always leads somewhere", () => {
  it("waits only while loading", () => {
    expect(startTarget({ ...base, loading: true })).toBeNull();
  });
  it("account → home, even while other data loads", () => {
    expect(startTarget({ ...base, hasAccount: true, loading: true })).toBe("/domu");
  });
  it("signed out → sign-in", () => {
    expect(startTarget({ ...base, signedIn: false })).toBe("/auth");
  });
  it("signed in, no membership → onboarding", () => {
    expect(startTarget({ ...base, needsOnboarding: true })).toBe("/onboarding");
  });
  it("signed in, account not readable → app (shows Try again), not stuck", () => {
    expect(startTarget(base)).toBe("/domu");
  });
});

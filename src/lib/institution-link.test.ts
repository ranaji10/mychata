import { afterEach, describe, expect, it, vi } from "vitest";
import { personalEmailToLink, rememberPersonalEmail } from "./institution-link";

const store = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
});

describe("linking a personal email to a new institution (PR #46 review)", () => {
  afterEach(() => {
    store.clear();
    vi.useRealTimers();
  });
  it("links only for the work email that was typed", () => {
    rememberPersonalEmail("Anna@gmail.com", "anna@uni.cz");
    expect(personalEmailToLink("anna@uni.cz")).toBe("anna@gmail.com");
    // Someone else's institution in the same browser:
    expect(personalEmailToLink("petr@firma.cz")).toBeNull();
  });
  it("forgets after a day", () => {
    vi.useFakeTimers();
    rememberPersonalEmail("anna@gmail.com", "anna@uni.cz");
    vi.advanceTimersByTime(25 * 3600 * 1000);
    expect(personalEmailToLink("anna@uni.cz")).toBeNull();
  });
});

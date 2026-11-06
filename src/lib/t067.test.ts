import { QueryClient, QueryObserver, onlineManager } from "@tanstack/react-query";
import { afterEach, describe, expect, it } from "vitest";
import { oauthReturnEvent } from "./analytics";
import { overlapPeakGuests } from "./data";
import { OFFLINE_LOAD_ERROR, firstLoadError } from "./load-error";
import { shellScreen } from "./shell-screen";

const base = {
  loading: false,
  signedIn: true,
  needsOnboarding: false,
  error: false,
  retrying: false,
};

describe("app shell screens, as behaviour (T-067, O-20)", () => {
  it("loading, signed out and onboarding show the loading screen", () => {
    expect(shellScreen({ ...base, loading: true })).toBe("loading");
    expect(shellScreen({ ...base, signedIn: false })).toBe("loading");
    expect(shellScreen({ ...base, needsOnboarding: true })).toBe("loading");
  });
  it("a failed or paused read shows the card; Try again keeps it up while loading", () => {
    expect(shellScreen({ ...base, error: true })).toBe("error");
    expect(shellScreen({ ...base, loading: true, retrying: true })).toBe("error");
    expect(shellScreen({ ...base, retrying: true })).toBe("error");
  });
  it("otherwise the app", () => {
    expect(shellScreen(base)).toBe("app");
  });
});

describe("a read paused offline with nothing cached is an error (O-20)", () => {
  it("paused with nothing to show → offline; paused with cached data → nothing", () => {
    expect(firstLoadError([[null, true, true]])).toBe(OFFLINE_LOAD_ERROR);
    expect(firstLoadError([[null, false, true]])).toBeNull();
    const boom = new Error("boom");
    expect(firstLoadError([[boom, true, true]])).toBe(boom);
    expect(firstLoadError([[null, true, false]])).toBeNull();
  });

  afterEach(() => onlineManager.setOnline(true));

  it("React Query really pauses offline: no error, not loading, then resumes online", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { networkMode: "offlineFirst", retry: 0 } },
    });
    client.mount();
    let fail = true;
    onlineManager.setOnline(false);
    const observer = new QueryObserver(client, {
      queryKey: ["members", "x"],
      queryFn: async () => {
        if (fail) throw new TypeError("Failed to fetch");
        return ["Anna"];
      },
      retry: 1,
      retryDelay: 1,
    });
    const unsubscribe = observer.subscribe(() => {});
    await new Promise((r) => setTimeout(r, 50));
    let r = observer.getCurrentResult();
    expect(r.fetchStatus).toBe("paused");
    expect(r.error).toBeNull();
    expect(r.isLoading).toBe(false);
    expect(firstLoadError([[r.error, !r.data, r.fetchStatus === "paused"]])).toBe(
      OFFLINE_LOAD_ERROR,
    );
    fail = false;
    onlineManager.setOnline(true);
    await new Promise((r2) => setTimeout(r2, 50));
    r = observer.getCurrentResult();
    expect(r.data).toEqual(["Anna"]);
    expect(firstLoadError([[r.error, !r.data, r.fetchStatus === "paused"]])).toBeNull();
    unsubscribe();
    client.unmount();
    client.clear();
  });

  it("a first start offline (memberships read paused, nothing cached) shows the card, not the app", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { networkMode: "offlineFirst", retry: 0 } },
    });
    client.mount();
    onlineManager.setOnline(false);
    const observer = new QueryObserver<string[]>(client, {
      queryKey: ["identity-members", "u"],
      queryFn: async () => {
        throw new TypeError("Failed to fetch");
      },
      retry: 1,
      retryDelay: 1,
    });
    const unsubscribe = observer.subscribe(() => {});
    await new Promise((r) => setTimeout(r, 50));
    const r = observer.getCurrentResult();
    // As account.tsx computes them: not loading, not loaded, no error of its own.
    const identityError = firstLoadError([
      [r.error, !r.data?.length, r.fetchStatus === "paused" && !r.data],
    ]);
    expect(identityError).toBe(OFFLINE_LOAD_ERROR);
    expect(shellScreen({ ...base, loading: r.isLoading, error: !!identityError })).toBe("error");
    unsubscribe();
    client.unmount();
    client.clear();
  });
});

describe("the booking screen counts others' day visits (O-30)", () => {
  const dayVisit = {
    start_date: "2026-11-20",
    end_date: "2026-11-20",
    guests: 3,
    status: "CONFIRMED",
  };
  it("a stay over a day visit's day meets it", () => {
    expect(overlapPeakGuests("2026-11-19", "2026-11-21", [dayVisit])).toBe(3);
    expect(overlapPeakGuests("2026-11-20", "2026-11-20", [dayVisit])).toBe(3);
  });
  it("leaving on its day or arriving the day after does not", () => {
    expect(overlapPeakGuests("2026-11-18", "2026-11-20", [dayVisit])).toBe(0);
    expect(overlapPeakGuests("2026-11-21", "2026-11-23", [dayVisit])).toBe(0);
  });
  it("declined or withdrawn day visits don't count", () => {
    expect(
      overlapPeakGuests("2026-11-19", "2026-11-21", [{ ...dayVisit, status: "DECLINED" }]),
    ).toBe(0);
  });
});

describe("Google sign-in counted on return (N-23)", () => {
  const at = Date.parse("2026-11-06T17:00:00Z");
  const marker = { method: "google" as const, source: "app", at };
  it("a sign-in created after the tap is a sign_up", () => {
    expect(oauthReturnEvent(marker, "2026-11-06T17:00:20Z", at + 30_000)).toBe("sign_up");
  });
  it("an older sign-in is a login", () => {
    expect(oauthReturnEvent(marker, "2026-10-01T10:00:00Z", at + 30_000)).toBe("login");
  });
  it("no marker, or one older than 30 minutes, sends nothing", () => {
    expect(oauthReturnEvent(null, "2026-11-06T17:00:20Z", at)).toBeNull();
    expect(oauthReturnEvent(marker, "2026-11-06T17:00:20Z", at + 31 * 60_000)).toBeNull();
  });
});

// Bug 3 of 18 Oct 2026, the iPhone half: "Could not save: TypeError: Load failed", and the
// same save working on the second tap.
//
// "Load failed" is Safari's (and every iPhone browser's) word for a request that never got an
// answer. It typically happens to the first request after the phone was idle or the tab was in
// the background: the browser reuses a connection the network has already dropped. The second
// request opens a fresh connection and works.
//
// What this does, for requests to our Supabase project only:
// - Reads and other repeatable requests (GET, HEAD, PATCH, PUT, DELETE and the RPCs listed
//   below, which set a value rather than add one) are retried once after such a failure.
// - An INSERT (POST to a table) is never retried blindly: if the first one did arrive, a retry
//   would save it twice. Instead, after a quiet spell, a tiny read goes first to wake the
//   connection up, so the save itself goes out on a working one.

const IDEMPOTENT_RPCS = new Set([
  "current_account_id",
  "current_member_id",
  "claim_initial_membership",
  "set_active_account",
  "set_member_role",
  "set_public_calendar",
  "set_property_overlap",
  "update_property_details",
  "invitation_preview",
  "my_cottages",
  "my_invitations",
  "feature_enabled",
  "account_plan",
  "plan_limit",
  "search_manual",
]);

/** How long without a Supabase answer before a save first wakes the connection. */
export const IDLE_MS = 20_000;

export function isNetworkFailure(error: unknown): boolean {
  if (!(error instanceof TypeError)) return false;
  return /load failed|failed to fetch|networkerror|network connection was lost|fetch failed/i.test(
    error.message,
  );
}

/** Safe to send twice: reads, updates that set a value, and the RPCs above. */
export function isRepeatable(method: string, url: string): boolean {
  const m = method.toUpperCase();
  if (m === "GET" || m === "HEAD" || m === "PATCH" || m === "PUT" || m === "DELETE") return true;
  const rpc = /\/rest\/v1\/rpc\/([a-z_0-9]+)/i.exec(url)?.[1];
  if (m === "POST" && rpc) return IDEMPOTENT_RPCS.has(rpc);
  // Signed links for files can be asked for again.
  return m === "POST" && /\/storage\/v1\/object\/sign\//.test(url);
}

let installed = false;

export function installNetworkRetry(supabaseUrl: string | undefined) {
  if (installed || typeof window === "undefined" || !supabaseUrl) return;
  installed = true;
  const base = supabaseUrl.replace(/\/$/, "");
  const originalFetch = window.fetch.bind(window);
  let lastAnswer = Date.now();
  let hiddenSince: number | null = null;
  document.addEventListener("visibilitychange", () => {
    hiddenSince = document.visibilityState === "hidden" ? Date.now() : hiddenSince;
  });

  const wake = async (headers: Headers) => {
    // Any small authenticated read will do; the answer is ignored.
    const apikey = headers.get("apikey");
    try {
      await originalFetch(`${base}/auth/v1/health`, {
        headers: apikey ? { apikey } : {},
        cache: "no-store",
      });
    } catch {
      /* the real request below reports the problem */
    }
  };

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (!url.startsWith(base)) return originalFetch(input, init);
    const method = (
      init?.method ?? (input instanceof Request ? input.method : "GET")
    ).toUpperCase();
    const repeatable = isRepeatable(method, url);
    const quiet = Date.now() - lastAnswer > IDLE_MS || hiddenSince !== null;
    if (!repeatable && quiet) {
      await wake(new Headers(init?.headers ?? (input instanceof Request ? input.headers : {})));
    }
    hiddenSince = null;
    try {
      const response = await originalFetch(input, init);
      lastAnswer = Date.now();
      return response;
    } catch (error) {
      if (!repeatable || !isNetworkFailure(error) || init?.signal?.aborted) throw error;
      console.warn("[network] retrying once after", (error as Error).message, method, url);
      const response = await originalFetch(input, init);
      lastAnswer = Date.now();
      return response;
    }
  };
}

// A tab left open across a release asks for code-split page code that no longer exists.
// Browsers report it with these messages; one reload fetches the new release (bug 1).

export function isStaleChunkError(error: unknown): boolean {
  const message = String((error as { message?: unknown } | null)?.message ?? error ?? "");
  return /dynamically imported module|Importing a module script failed|error loading dynamically imported|Failed to fetch dynamically|Unable to preload CSS|ChunkLoadError|Loading chunk \S+ failed/i.test(
    message,
  );
}

const RELOAD_KEY = "mychata.reloaded-for-version";

/** Reloads the page at most once a minute. Returns true when it reloaded. */
export function reloadOnceForNewVersion(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
    if (Date.now() - last < 60_000) return false;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    return false;
  }
  window.location.reload();
  return true;
}

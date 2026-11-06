/**
 * The first read error that has no cached data to fall back on (T-052). Each entry is
 * [the query's error, whether the screen would have nothing to show without it, whether the
 * read is paused]. Queries run with `networkMode: "offlineFirst"`: once the browser is offline,
 * a read that fails pauses instead of erroring, with no error and no loading, so the app used
 * to open empty (PR #82 review, O-20). A paused read with nothing to show counts as offline.
 */
export const OFFLINE_LOAD_ERROR = new Error("offline: read paused until the connection returns");

export function firstLoadError(reads: [Error | null, boolean, boolean?][]): Error | null {
  for (const [error, nothingToShow, paused] of reads) {
    if (!nothingToShow) continue;
    if (error) return error;
    if (paused) return OFFLINE_LOAD_ERROR;
  }
  return null;
}

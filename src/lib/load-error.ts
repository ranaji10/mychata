/**
 * The first read error that has no cached data to fall back on (T-052). Each entry is
 * [the query's error, whether the screen would have nothing to show without it].
 */
export function firstLoadError(reads: [Error | null, boolean][]): Error | null {
  for (const [error, nothingToShow] of reads) if (error && nothingToShow) return error;
  return null;
}

/**
 * Which screen the app shell draws (T-052, T-067). Kept out of AppShell.tsx so it can be
 * tested as behaviour, not by reading the component's source (PR #82 review, O-20).
 * - "loading": still loading (and not keeping the error card up for a retry), no sign-in yet,
 *   or on the way to onboarding.
 * - "error": a read failed or paused with nothing cached, or "Try again" is still working.
 * - "app": everything else.
 */
export type ShellScreen = "loading" | "error" | "app";

export function shellScreen(s: {
  loading: boolean;
  signedIn: boolean;
  needsOnboarding: boolean;
  error: boolean;
  retrying: boolean;
}): ShellScreen {
  if ((s.loading && !s.retrying) || !s.signedIn || s.needsOnboarding) return "loading";
  if (s.error || s.retrying) return "error";
  return "app";
}

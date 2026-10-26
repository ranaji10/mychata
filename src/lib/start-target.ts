/**
 * Where the start screen ("/") sends someone once the account state is known (T-051).
 * null = keep waiting. Every finished state has a target, so the screen never waits forever.
 */
export function startTarget(s: {
  hasAccount: boolean;
  loading: boolean;
  signedIn: boolean;
  needsOnboarding: boolean;
}): "/domu" | "/auth" | "/onboarding" | null {
  if (s.hasAccount) return "/domu";
  if (s.loading) return null;
  if (!s.signedIn) return "/auth";
  if (s.needsOnboarding) return "/onboarding";
  // Signed in, but the account could not be read. The app pages show "Try again" when the
  // membership read failed; an accounts-only failure shows an empty Home (backlog, T-051 review).
  return "/domu";
}

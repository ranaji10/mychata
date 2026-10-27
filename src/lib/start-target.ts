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
  // Signed in, but the account could not be read. The app pages show "Try again" for a failed
  // membership, accounts, cottages or members read (T-052).
  return "/domu";
}

# B-013 An invitation opened while signed out is lost; no way to accept with the wrong account

Reported: 2026-09-28 by maintainer review of mychata.cz · Status: fixed on branch `agent/claude/T-019-invites-signin-demo` (not yet live)
Where: mychata.cz/pozvanka/<token> in a browser that isn't signed in, or signed in with another Google account
Screenshot: none (network and console recordings in the workspace private/ folder)
Steps to reproduce: see Where.
Expected / actual: expected: sign in, come back, accept. Actual: the page sent people to /auth and forgot the token, so after sign-in they landed on Home or onboarding with nothing to accept. With another account signed in it only said "invalid".
Test that reproduces it: `src/lib/invites.test.ts` (error mapping); manual check in the release list

Fix: The page now shows what the invitation is for (`invitation_preview`, migration 0020: chata, role, inviter, masked email) and an explicit Accept button. Signed out: "Sign in to accept" keeps the token (`src/lib/pending-invite.ts`) through sign-in, Google's redirect and onboarding. Wrong account: says which email the invitation is for and offers "Sign out and use the invited account".

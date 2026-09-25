# B-001 iOS Safari: "Signed-in member ?" after Google sign-in

Reported: 2026-09-25 · Status: likely fixed on `main`, not yet live
Where: mychata.cz, iPhone Safari, Google sign-in, new account not invited by anyone
Screenshot: `private/Screenshots/Bugs/NoLogin Pull after signing in through google on ios safar 2026-09-25 at 00.44.30.jpeg` (workspace folder, outside the repo)
Cause: the account wasn't linked to any member, and the live build predated the onboarding gate (`needsOnboarding` in `src/lib/account.tsx`), so the app showed an unlinked member instead of sending the person to onboarding. The screenshot still shows the Language card that `main` already removed, which confirms an older build.
Next: after T-001 is published, repeat on iPhone Safari with a fresh Google account: expected redirect to `/onboarding`. Covered by T-004 once test accounts exist.

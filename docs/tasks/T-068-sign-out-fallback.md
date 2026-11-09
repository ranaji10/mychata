# T-068 Sign-out keeps working when the server fails (before PR #116)

Owner: Claude (cloud session) · Status: review

Goal: make Dependabot's PR #116 safe to merge. supabase-js 2.119 (auth-js PR #2786) changed `signOut()`: when the server call fails (offline, 5xx), the default global sign-out now keeps the session in the browser; 2.118 removed it. Three screens (Profil, Více, invitation "switch account") ignored the error and opened sign-in, so after the bump the button would look like it worked while the person stayed signed in (invariant 6).

Non-goals: `sign-in-again.ts` (already local scope with a timeout); the scope itself (stays global: "Odhlásit se" signs out every device).

Files allowed: `src/lib/sign-out.ts` (new), `src/lib/t068.test.ts` (new), `src/lib/t047.test.ts`, `src/routes/profil.tsx`, `src/routes/vice.tsx`, `src/routes/pozvanka.$token.tsx`, `src/routes/onboarding.tsx`, `src/components/InstitutionSetup.tsx`, `docs/STATUS.md`, this brief.

Invariants touched: 5 (new text through `t()`), 6 (every sign-out error now handled).

## What changes

1. `signOutHere(where)`: global sign-out; on error, logs it and signs out this device (`scope: "local"`, which removes the session before calling the server). Reports an error only if a session is still in the browser.
2. All five sign-out buttons use it; on an error they show "Odhlášení se nepodařilo. Zkuste to znovu." and stay put.
3. A test fails if any screen calls the raw `auth.signOut()` again.

## Acceptance

- `bun run check` on 2.118 (main) and with PR #116's lockfile (2.119): both pass.
- After publish: Více → Odhlásit se opens sign-in and the session is gone.

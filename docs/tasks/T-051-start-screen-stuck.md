# T-051 Start screen never waits forever

Owner: Claude (cloud session) · Status: review

Goal: the start screen "Otevírám vaši chatu" (`/`) always moves on: to Home, sign-in or onboarding, or after 10 s offers "Zkusit znovu" and "Přihlásit se znovu".
Non-goals: Google sign-in on Brave (F-05, D-31); the account and membership queries themselves.
Files allowed: `src/routes/index.tsx`, `src/lib/start-target.ts`, `src/lib/t051.test.ts`, `docs/STATUS.md`, this brief.
Invariants touched (AGENTS.md): 5 (text through `t()`, 44px buttons), 6 (sign-out error logged).
Context: reported 26 Oct 2026 (F-33): Brave on a MacBook stays on the start screen, refresh doesn't help; Chrome on Android signs in.

Cause found in code: `/` redirected only when an account was loaded or nobody was signed in. A signed-in person with no account yet (a new sign-up landing on `/`, or memberships that couldn't be read) had no target and stayed there on every refresh. A saved session that never answers (`getUser` hanging) also kept `loading` true for good.

Acceptance (runnable):

- `bun run check` passes; `src/lib/t051.test.ts` covers every state of `startTarget`.
- After publish, in the stuck Brave window: the page moves on, or after 10 s "Přihlásit se znovu" clears the saved session and opens sign-in.

Handoff note: not verified in a browser before publish (no local test sign-in); the Brave state itself was not inspected, so which of the two causes it hit is open.

Review (fresh, 26 Oct): button styling and offline-cache clean-up fixed. Open, outside this brief: if memberships load but the accounts read fails, Home shows empty with no "Try again"; once an account is loaded, a hanging properties/members read leaves AppShell blank with no fallback. Review: `docs/external/claude/2026-10-26-pr81-review.md`.

# B-003 Person linked to an existing account is sent to onboarding and gets "Admin role required"

Reported: 2026-09-26 (Brave mobile inspector files, `private/Screenshots/Brave Mobile Access Inspector Files/`) · Status: fixed on branch `agent/claude/onboarding-fixes`

What happened: a Google sign-in was linked by email to a member row an admin had created (account "Rodina Novákových", role MEMBER). The profile stayed "onboarding not done", so the app opened onboarding. Onboarding saw an existing membership, skipped creating an account and called `add_property` on that account, which only admins may do → HTTP 403, `42501 Admin role required`.

Fix:

- Migration 0017: `claim_initial_membership()` marks onboarding complete when it links a person; backfills everyone who already has a membership.
- `account.tsx`: anyone with a membership never needs onboarding.
- `onboarding.tsx`: only admins add chatas to the current account; everyone else gets their own new account (where they are admin).
- `/chata/nova`: non-admins see an explanation and "Create my own account" instead of a form that fails.
- Clear message for `42501` in both places.

Tests: `supabase/tests/security.test.ts` → "onboarding and joining (B-003)".

Open question for you: the demo family "Rodina Novákových" contains a real member row for a real Gmail address. Someone added it by hand. That ties to demo-data removal (T-012).

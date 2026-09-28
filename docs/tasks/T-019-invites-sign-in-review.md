# T-019 Invitations, sign-in and review fixes (28 Sep 2026)

Owner: Claude · Status: review (branch `agent/claude/T-019-invites-signin-demo`)
Goal: fix what the 28 Sep maintainer review found, without changing anything Lovable depends on.

In this branch:

- Invitations: several people at once, role per person (changeable while pending), send by email (opens your mail app with a ready Czech + English message), share, copy, cancel. Admin invitations work (B-011). The invitation page shows what it's for and has an Accept button; expired/used/unknown links are explained (B-012); signed-out people keep the link through sign-in and onboarding; the wrong signed-in account gets "Sign out and use the invited account" (B-013). Migration 0020.
- Sign-in: email + password and sign-up work again (B-014); errors say what went wrong.
- Main photo shows on Home (B-015). Phone numbers are checked and stored as +420… (B-016).
- Leaving checklist: renamed from handover; past departures expand (B-017); Home shows the last departure to whoever comes next.
- Ready-made checklists ask "who does them": all to one person or each task separately; a second tap warns instead of silently duplicating. New tasks default to me.
- T-012: demo data removed by migration 0019.

Not in this branch (needs email or new tables): emailing the leaving checklist to the next booker (CC-3), invitation emails sent by the app itself (T-005/CC-3), duplicate-proof checklists in the database (CC-2), document vault search (T-020), a livelier public calendar (Lovable, L-1).

Acceptance: `bun run check` green in CI (tests in `supabase/tests/security.test.ts` → "invitations (T-019…)", "demo data removed (T-012…)", `src/lib/invites.test.ts`, `src/lib/data.test.ts` → normalizePhone). Manual: the release checks plus sign-up with a non-Gmail address, an invitation opened while signed out, and one opened with the wrong account.

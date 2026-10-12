## L-2b PR #16 review fixes (12 Oct 2026)

- [x] Adjacent clipboard fields with focus, selection and persistent status text.
- [x] Filtered task groups and retryable task errors; account-scoped stay cache and missing state.
- [x] Guest date guidance and plain-text dates; review housekeeping.
- [ ] Verify using synthetic data at phone width; no live guest links or member details.
- [ ] Do not publish before PR #16 is merged.

## L-2 tasks, approvals and rough edges (12 Oct 2026)

- [x] Group tasks by checklist, with collapsed completed sections.
- [ ] Verify scroll restoration after adding with test data.
- [ ] Verify administrator names and next steps for pending stays with test data.
- [x] Confirm one empty-expenses action; provide manual-copy fields when copying fails.
- [x] Reuse the booking calendar on the guest form without changing its submission.
- [x] Check synthetic checklist interactions and real guest date selection at 375px; update status.
- [ ] Verify real task updates/checklist addition, pending stay, clipboard denial and empty Expenses: requesting user's session requires onboarding.
- [ ] Publish only after human-reviewed green CI and first release tag; then run file 10 (not supplied).

## UI/wording pass (29 Sep 2026, verified) — UI only, no migrations/SQL/RLS/auth/server functions

- [x] 1. Chata switcher: header chata name opens sheet listing all chatas+accounts with role, switchAccount; "Add a chata" at bottom; keep Profile switcher
  - Scope note: sheet lists every account I belong to with role; cottages only for the active account (listing other accounts' cottages needs an RLS change — prohibited this pass)
- [x] 2. Home: primary "Přidat pobyt / Add booking" → /kalendar?book=true; whole "Next stay" card tappable
- [x] 4. Tasks: whole task tile opens /ukoly/$id
- [x] 5. Tab "Více/More" → "Nastavení/Settings" (route /vice); sections open with back arrow to Settings
- [x] 6. Guest/public calendar links: navigator.share() when available, else copy + toast "Odkaz zkopírován / Link copied"; never alert()
- [x] 7. Public calendar: inviting — chata name, month view free/booked colours, next free weekend highlighted, season, Share; no guest names; keep CZ/EN + invalid-link message
- [x] 8. Guest booking page: label dates "Příjezd/Arrival", "Odjezd/Departure"; admin reply wording change
- [x] 9. Expenses empty state: only one "Add expense" button

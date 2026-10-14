## T-028 Fresh air public pages (14 Oct 2026)

- [x] Restyle only allowed public routes and fallback pages; Czech link previews and priority seasonal heroes.
- [ ] Check sign-in, reset, five onboarding steps, test-cottage public calendar and 404 at 375px, 768px and 1280px; record untested states (partial: sign-in, reset, public calendar and 404 checked; onboarding was checked with the account-type selector, which 0f63c77 removed, so the five steps need a re-check for a family and an institution sign-up).
- [ ] Check contrast, brands, cookie position and write the scoped report (partial: see report).
- [ ] Remaining guest/invitation/institution public states: requires test-cottage links and an institutional test account.
- [ ] Institutional live-data checks: requires an institutional test account.

## Fresh air signed-in pages (14 Oct 2026)

- [x] Replace seasonal asset pointers with ordinary bundled photos and verify autumn in development.
- [x] Restyle Tasks, Expenses, Stays, Cottage, People/settings and used shared UI, preserving behaviour.
- [x] Capture before/after examples and check accessible family pages at 375px/1280px in the test cottage.
- [x] Verify stay, task, expense creation, checkout, main photo and manual-question flows; record evidence in docs/external/lovable/2026-10-14-l5b-pages-review.md.
- [ ] Verify settlement between two people and populated institution pages: no second member or institutional test account.
- [ ] Full bun run check and production hashed-image request: manual builds/typechecks prohibited in this workspace; CI/maintainer verification required.
- [ ] Grouped commits to lovable-sync: blocked by the platform-managed workspace branch; no manual Git writes allowed.

## Fresh air foundation (14 Oct 2026)

- [x] Replace design rules, tokens, font and brand switching.
- [x] Add supplied seasonal photos and Prague season tests.
- [x] Restyle shell, shared bits, sign-in, Home and Calendar only.
- [x] Verify 375px/1280px in the test cottage; record limitations and checks.
- [ ] Full check gate: supplied design text fails Prettier; exact preservation prevents formatting it.
- [ ] Maintainers verify signed-in institution/account switching; no institutional test account.
- [ ] Human review and green CI before publishing (not requested).

## L-2b PR #16 review fixes (12 Oct 2026)

- [x] Adjacent clipboard fields with focus, selection and persistent status text.
- [x] Filtered task groups and retryable task errors; account-scoped stay cache and missing state.
- [x] Guest date guidance and plain-text dates; review housekeeping.
- [x] Verify using synthetic data at phone width; no live guest links or member details.
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

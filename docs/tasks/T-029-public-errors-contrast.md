# T-029 Follow-ups from the PR #26, #28 and #31 reviews

Owner: Claude · Status: review

Goal: close the small review findings that fall outside the T-027 and T-028 allowlists, so none of them is lost.
Non-goals: no migrations, policies, database functions, package changes or restyling.
Files allowed: `src/lib/guest.functions.ts`, `src/components/calendar.tsx`, `src/components/AppShell.tsx`, `src/lib/consent.tsx`, `docs/tasks/T-027-l5b-followups.md`, `docs/tasks/T-028-l5c-public-pages.md`, `docs/tasks/T-029-public-errors-contrast.md`, `docs/external/lovable/2026-10-14-l5a-foundation-review.md`, `docs/external/lovable/2026-10-14-l5b-pages-review.md`, `docs/external/claude/2026-09-25-critical-review.md` (copy of the Claude doc).
Invariants touched (AGENTS.md): 6 (errors).
Context: `docs/external/claude/2026-10-14-pr26-review.md`, `2026-10-14-pr31-review.md`, `docs/external/lovable/2026-10-14-l5c-public-pages.md` ("Contrast and shared blockers").

Acceptance (runnable):

- `bun run check` passes
- Guest link (PR #31 review): `getGuestLinkInfo` throws when `public_guest_link` returns an error and still returns `null` for an unknown or expired token, so `/host/$token` says "Chatu se nepodařilo načíst" for the first and "Tento odkaz už neplatí" for the second
- Calendar contrast (L-5c report): other-month dates use `text-subtle` (4.52:1 on the white card) instead of `text-faint` (2.25:1)
- Consent banner (PR #26 review): `AppShell` sets `has-tabbar` only when it draws the tab bar, not on its loading and error screens
- Consent log (PR #26 review): the `consent_log` insert error is logged (invariant 6); it still never blocks the banner
- Docs (PR #26 review): T-027's tick criterion says 24/26px as in design.md; the L-5a/L-5b Lovable reports no longer say `task: T-026` and have a `model:` line; T-028's acceptance lists typecheck and `bun run check`

Handoff note: every change is a line or two. Not verified in a browser. The calendar change shows on every calendar, where other-month dates now look like past dates.

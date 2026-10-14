# T-029 Public pages: guest-link error and calendar contrast

Owner: Claude · Status: review

Goal: two follow-ups from the T-028 reviews that need files outside the T-028 allowlist.
Non-goals: no migrations, policies, database functions, package changes or restyling.
Files allowed: `src/lib/guest.functions.ts`, `src/components/calendar.tsx`, `docs/tasks/T-029-public-errors-contrast.md`, `docs/STATUS.md`.
Invariants touched (AGENTS.md): 6 (errors).
Context: `docs/external/claude/2026-10-14-pr31-review.md` (2. Correctness, first finding), `docs/external/lovable/2026-10-14-l5c-public-pages.md` ("Contrast and shared blockers").
Acceptance (runnable):

- `bun run check` passes
- `getGuestLinkInfo` throws when `public_guest_link` returns an error, and still returns `null` for an unknown or expired token, so `/host/$token` shows "Chatu se nepodařilo načíst" for the first and "Tento odkaz už neplatí" for the second
- Other-month dates in the shared calendar use `text-subtle` (4.52:1 on the white card, measured in the L-5c report) instead of `text-faint` (2.25:1)

Handoff note: both changes are one line each. Not verified in a browser; the calendar change shows on every calendar (signed-in and public), where other-month dates now look like past dates.

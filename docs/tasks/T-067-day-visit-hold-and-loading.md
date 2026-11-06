# T-067 Day visits in the overlap rule (O-30), no endless loading (O-20)

Owner: Claude (cloud session) · Status: review

Goal: the two backlog items with no dependency on a maintainer, from the call of 6 Nov 2026 ("complete everything on the roadmap that has no dependency"): (1) O-30, a member's booking on a day someone has a day visit was never held by the overlap rule; (2) O-20, what the PR #82 review left open: a read paused offline with nothing cached opened an empty app, a page's own hanging read had no way out, and the app shell's tests read source code.

Non-goals: request_public_booking and decide_guest_request (0044 already treats a day visit as its whole day); O-25 past stays (deferred); O-28 tab label size (design call); the offline banner.

Files allowed: `drizzle/migrations/0048_day_visit_overlap_rule.sql`, `drizzle/migrations/meta/_journal.json`, `drizzle/migrations/meta/0048_snapshot.json`, `supabase/tests/security.test.ts`, `src/lib/data.ts`, `src/lib/load-error.ts`, `src/lib/shell-screen.ts` (new), `src/lib/use-slow.ts` (new), `src/lib/account.tsx`, `src/components/AppShell.tsx`, `src/components/bits.tsx`, `src/lib/analytics.ts`, `src/routes/auth.tsx`, `src/lib/t067.test.ts` (new), `docs/generated/`, `docs/STATUS.md`, tracker copies, `docs/external/claude/2026-11-06-pr113-review.md`, `docs/external/claude/2026-11-06-site-check-2.md` and their README rows, this brief.

Invariants touched (AGENTS.md): 1 (definer function unchanged in reach: internal, no grants), 2 (new migration 0048), 5 (all text through `t()`), 6 (refetch failures logged).

## What changes

1. Migration 0048: `overlap_peak_guests` counts a 0-night stay on its own day (`[day, day + 1)`), as 0044's clash test does. A stay's departure day stays free. A null guest count counts as 1, as on the booking screen.
2. Booking screen (`overlapPeakGuests`): the same rule, so "will wait for the admin" matches the database.
3. `firstLoadError` takes whether a read is paused; the account context passes `fetchStatus === "paused"` for accounts, cottages and members, so offline with nothing cached shows "Jste offline. / Zkusit znovu" instead of an empty app; "Zkusit znovu" refetches paused reads too.
4. `LoadingCards` (the skeleton of Home, Calendar lists, Expenses, Tasks, Documents, Manual, Requests, Approvals, Handover, Notifications, public manual): after 10 s, "Načítání trvá déle než obvykle." with "Zkusit znovu" (refetches the page's active reads) and "Načíst stránku znovu".
5. N-23 (found while starring GA key events on 6 Nov): Google sign-in leaves the page through Lovable's broker, so it never sent `sign_up` or `login`; only email did, and `sign_up` never reached GA. The tap now stores a marker in the tab; the first signed-in load after it sends `sign_up` (sign-in created after the tap) or `login`, `method: "google"`.
6. The shell's screen choice is a pure function (`shell-screen.ts`), tested as behaviour; a test drives a real React Query client offline and back online.

## Acceptance

- `bun run check`; the O-30 test in `security.test.ts` fails without 0048 (checked) and passes with it; `src/lib/t067.test.ts`.
- Lovable applies 0048 (prompt in the PR); then, in a test cottage with "No" to overlapping stays, a member's stay over another member's day visit waits for the admin.

Handoff note: in the PR.

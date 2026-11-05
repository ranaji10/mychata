# T-060 Date fields, drafts and small checks (bug hunt of 5 Nov 2026, evening)

Owner: Claude (cloud session) · Status: review

Goal: fix what the evening bug hunt on live build `957a75c` found (report: `docs/external/claude/2026-11-05-site-check-2.md`), and close O-22.

1. New booking: clearing or half-typing Arrival/Departure crashed the page ("This page did not load", `RangeError: Invalid time value`). Empty or incomplete dates now show a line and keep the button off.
2. Task detail: the due date saved on every keystroke, so typing 20112026 stored 20.11.0002. It now saves once the date is complete (year 2000–2100), or when the field is left empty.
3. Add task with the date field emptied failed with "Could not add the task"; an empty date is now "no due date".
4. Checkout Tasks: ticks and notes of one cottage stayed on screen after switching cottage and were saved into the other cottage's draft; saving the draft no longer throws when the browser blocks storage.
5. Public stay request form (organisations): a past or empty arrival is refused on the page with a clear line; the server's "dates" answer gets a clear message instead of "Could not send".
6. Count fields accepted "1e2", "0x10", "+5", "5.0": only digits now.
7. Public calendar request: "2.5" guests was sent as 2; the field now uses the same whole-number check and line.
8. Expenses: amounts with hellers show exactly (1 250,50 Kč, the 1 000 / 3 preview 333,34 + 333,33 + 333,33), as Settle debts already does.
9. Documents: an expiry date before the issue date is refused.
10. Task and stay pages with a malformed id in the link say "not found" at once instead of retrying for 10 s and blaming the connection.
11. O-22: "Guest booking link" reuses the newest open link of the cottage instead of making a new one per tap.

Non-goals: O-23 (ask before publishing the calendar), O-24 (0-night stays), O-25 (past stays by admins) are product calls; no migration.

Files allowed: `src/lib/{data,cottage-details}.ts`, `src/lib/t060.test.ts`, `src/components/{PublicBookingRequest,ExpenseDetail}.tsx`, `src/routes/{rezervace.nova,rezervace.$id,ukoly,ukoly.$id,predani,verejne.zadost.$token,vydaje,dokumenty,vice}.tsx`, `docs/STATUS.md`, `docs/external/claude/*`, this brief.

Invariants touched (AGENTS.md): 5 (all text through `t()`), 6 (errors handled).

Acceptance: `bun run check`; after publish, the "Recheck after publish" steps in `docs/external/claude/2026-11-05-site-check-2.md`.

# T-055 Don't e-mail what no longer stands

Owner: planner writes, implementer builds · Status: todo

Goal: a notification whose subject was withdrawn or already handled before the queue ran is not e-mailed.
Non-goals: the in-app list (it already drops cancelled offers); e-mail texts; the cron schedule.
Files allowed: `src/lib/notification-queue.server.ts`, `src/lib/t053.test.ts` or a new `src/lib/t055.test.ts`, `docs/STATUS.md`, this brief. If the check is done in the database instead, a new migration (claim the number first) and `supabase/tests/`.
Invariants touched (AGENTS.md): 1, 6.
Context: `docs/external/claude/2026-11-03-site-check-2.md` (finding 1), `docs/tasks/T-053-notifications.md`.

Seen live 3 Nov 2026: an ownership offer cancelled ~4 minutes before the cron run was still e-mailed; a "Stay to approve" e-mail went out 8 seconds after the stay was approved.

Rule before sending, per kind (skip with `email_error = 'withdrawn'`, `email_wanted = false`):

- `ownership_offered`: the offer is still PENDING.
- `invitation`: the invitation is still PENDING and not expired.
- `booking_awaiting_approval`: the booking still exists and still waits for approval.
- others: send as now.

Acceptance:

- `bun run check` passes; tests: each kind above is skipped once withdrawn and sent while it stands.
  Handoff note:

# T-053 Stored notifications, e-mail queue, task notes (CC-3)

Owner: Claude (cloud session) · Status: review

Goal: the important events reach the right person as a stored notification and an e-mail from `notify.mychata.cz`, and members can leave notes on maintenance tasks that @-mention each other.
Non-goals: screens (Lovable builds task notes, "Napsat správci" and "Připomenout" in L-3, prompt 07); per-person e-mail settings; institutional-form requesters; document expiry e-mails; own hosting (T-002).
Files allowed: `drizzle/migrations/0038_notifications_task_notes.sql`, `drizzle/migrations/meta/_journal.json`, `drizzle/migrations/meta/0038_snapshot.json`, `supabase/security-allowlist.json`, `supabase/tests/t053.test.ts` (new), `src/lib/email.server.ts` (new), `src/lib/notification-email.ts` (new), `src/lib/notification-queue.server.ts` (new), `src/routes/api/notifications/send-emails.ts` (new), `src/routeTree.gen.ts` (generated), `src/lib/email-templates/notification.tsx`, `src/lib/email-templates/send-email.ts`, `src/lib/notification-list.ts`, `src/lib/notifications.ts`, `src/routes/upozorneni.tsx` (icons for the new kinds only), `src/lib/t053.test.ts` (new), `src/integrations/supabase/types.ts` (new tables and functions only), `docs/generated/*`, `docs/STATUS.md`, `docs/tasks/T-005-email.md`, this brief.
Invariants touched (AGENTS.md): 1 (three new tables, all with `account_id`, RLS, definer functions with caller checks), 2 (migration 0038), 5 (Czech first in e-mails and list items), 6 (every send failure recorded in `email_error`), 7 (tests use `example.org`/`example.test` and a fake sender).
Context: `prompts/2026-10-04/06-CC-3-notifications.md` (outside the repo), `docs/tasks/T-005-email.md`, `docs/architecture/tenancy-and-security.md`, `src/lib/notification-list.ts`, `docs/external/claude/2026-11-03-pr86-review.md`.

## Design

- **0038** adds `notifications` (one recipient: a member, a signed-in user who isn't a member, or an e-mail address for invitees and guests without an account), `task_notes` and `task_note_mentions`. Recipients read and mark read only their own; nobody inserts directly.
- **Triggers** create notifications, so today's screens need no change: booking waiting (to admins and cottage admins), booking confirmed or declined (to the requester, not when they did it themselves), public/guest request decided (to the requester's sign-in, else the guest's e-mail), ownership offered, invitation with an e-mail, handover submitted (leaving checklist to the member with the next confirmed stay; if none, it goes when the next stay is confirmed).
- **Functions** for L-3: `add_task_note`, `message_admins`, `remind_debt`, `mark_notifications_read`, `handover_next_recipient`.
- **E-mail**: one wrapper `src/lib/email.server.ts` (`sendEmail`), the only caller of Lovable's `sendNotificationEmail`. Texts per kind in `notification-email.ts`, Czech with English underneath (the app keeps the language choice only in the browser). Subjects carry no names.
- **Queue**: `POST /api/notifications/send-emails` (Lovable cron secret) sends up to 50 due e-mails, retries three times (5 min, 20 min, 80 min), stores `email_error`, never mails a member who left or has no e-mail. More than 60 e-mails a day caused by one person are stored but not e-mailed (`usage_counters`).
- **App list**: stored notifications are one more source in `buildNotifications`; a stored item replaces the computed one for the same booking or offer.

## Acceptance

- `bun run check` passes.
- `supabase/tests/t053.test.ts`: RLS for each new table as anon, member of A, admin of A, admin of B and a member who left A; each trigger; mention across accounts or of a member who left is refused; message and reminder limits; mark read.
- `src/lib/t053.test.ts`: e-mail text for every kind; queue sends, retries with backoff, records `email_error`, skips members who left; stored items in `buildNotifications` replace computed ones.
- rls-auditor and reviewer subagents run fresh; reports in `docs/external/claude/`.

Questions for the maintainers: e-mail on/off per person and per kind (now: always on); how long to keep notifications (now: kept); does the privacy page need a line about e-mail notifications.

Handoff note: filled in at the end.

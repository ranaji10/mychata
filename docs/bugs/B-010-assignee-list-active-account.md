# B-010 Assignee list must list only members of the active account

Reported: 2026-09-26 by walkthrough of mychata.cz (check requested) · Status: confirmed with one gap; list fixed on branch `agent/claude/T-017-review-bugs` (not yet live)
Where: task form (`/ukoly`, assignee), expense form (`/vydaje`, "Rozdělit mezi"); person who belongs to two accounts
Screenshot: none
Steps to reproduce: belong to accounts A and B; with A active, open the task form.
Expected / actual: only A's members. Actual: correct in normal use, but only because the app filters by its own copy of the active account. Row-level security (`is_member(account_id)`, 0011) lets a person read the members of every account they belong to, so if the app's copy is stale (account switched on another device, 7-day offline cache), B's members could be listed while tasks are saved into A.
Test that reproduces it: `supabase/tests/security.test.ts` → "assignee list (B-010)": two accounts, one person in both; proves the unfiltered read returns both lists and the list filtered by `current_account_id()` never contains a member of B while A is active (and the reverse).

Fix: `src/lib/account.tsx` asks the database for `current_account_id()` before loading members and filters by that. If it differs from the app's copy, the profile is re-read so the app follows the database.

Open gap (not fixed here, needs a migration): the `tasks` and `expense_splits` insert/update policies (0013) check the property, not the member. A hand-made request can set `assignee_member_id` / `member_id` to a member of another account. Impact is low (needs that member's UUID, and the name isn't shown across accounts), but it breaks the tenancy invariant. Proposed: migration 0019 with a check that the member belongs to the property's account, plus a test. The number must be claimed first (two-person workflow).

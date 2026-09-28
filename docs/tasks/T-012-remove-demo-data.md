# T-012 Remove demo data from production

Owner: maintainers decided (28 Sep 2026) · Status: review (migration 0019 on branch `agent/claude/T-019-invites-signin-demo`)
Context: the first migration seeded "Rodina Novákových" (Chata U Lípy, 4 members at example.cz) and the fake institution "Vysoká škola podhorní" with bookings, tasks and expenses. At least one real account was linked to the demo family, which is why reviewers saw strangers' names and expenses.

What 0019 does: copies every row of the two demo accounts into schema `demo_archive` (no API access), clears four "created by" pointers from other accounts, and deletes the two accounts (everything inside cascades). Real people keep their own accounts; one linked to a demo member loses only that membership.

After Lovable applies it:

1. Take a database export first (`runbooks/backup.md`), then ask Lovable to apply 0019 and 0020.
2. Check: the Home of every maintainer account shows their own chata; nobody sees "Chata U Lípy".
3. In Lovable's storage, delete the folders `b0000000-0000-4000-8000-000000000001/` and `…002/` (demo files, if any).
4. After two weeks without surprises, a new migration drops `demo_archive`.

`runbooks/remove-demo-data.sql` stays as the read-only check (part 1).

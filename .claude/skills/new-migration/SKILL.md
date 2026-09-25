---
name: new-migration
description: Create a new MyChata database migration correctly (numbered file in drizzle/migrations, journal entry, snapshot, RLS, grants, tests, regenerated docs). Use whenever a schema, policy or database function change is needed.
---

1. Next number: highest `idx` in `drizzle/migrations/meta/_journal.json` + 1 → `NNNN`.
2. Create `drizzle/migrations/NNNN_<snake_name>.sql`. First lines: a comment with what, why, and the task/ADR.
3. Append to `_journal.json`: `{"idx": N, "version": "7", "when": <ms timestamp>, "tag": "NNNN_<snake_name>", "breakpoints": true}`.
4. Copy the previous `meta/*_snapshot.json` to `meta/NNNN_snapshot.json`, set a new UUID `id` and `prevId` = previous id.
5. In the SQL: RLS on for new tables; explicit grants (none to anon); policies with `in_current_account()` / `is_admin()`; definer functions with `set search_path = public`, a caller check, `revoke execute ... from public, anon`, `grant ... to authenticated`.
6. Never edit an existing migration. Make it safe to run once on a database that already has data.
7. Add tests in `supabase/tests/security.test.ts`; run `bun run test:db`.
8. Patch `src/integrations/supabase/types.ts` for new columns/functions if the app uses them; run `bun run typecheck`.
9. `bun run docs:gen` and commit `docs/generated/`.
10. In the PR, say that Lovable must apply this migration (docs/runbooks/release.md).

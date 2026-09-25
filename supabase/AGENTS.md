# Database rules (read with the root AGENTS.md)

- New migration: next number in `drizzle/migrations/NNNN_short_name.sql` + an entry in `drizzle/migrations/meta/_journal.json` (copy the last entry, idx +1) + a copy of the last `meta/NNNN_snapshot.json` with a new `id` and `prevId`. Use the `new-migration` skill.
- Every migration file starts with a comment: what, why, and which defect/ADR.
- New table: `enable row level security`, explicit grants (never to `anon` unless reviewed), policies using `in_current_account()` / `is_admin()`, and a test in `supabase/tests/security.test.ts`.
- New SECURITY DEFINER function: `set search_path = public`, a caller or account check, `revoke execute ... from public, anon`, then grant to `authenticated`. Anything else needs an entry in `supabase/security-allowlist.json` and a human reviewer.
- Test locally: `bun run test:db`. The harness (`supabase/tests/harness.ts`) runs all migrations on PGlite with shims for `auth.uid()`, roles and `storage.objects`.
- After merging: Lovable must apply the migration to the database (see `docs/runbooks/release.md`), then `bun run docs:gen`.
- `supabase/migrations/` holds the first two migrations only and is frozen.

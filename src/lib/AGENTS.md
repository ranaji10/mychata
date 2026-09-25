# src/lib (read with the root AGENTS.md)

- `account.tsx`: memberships, active account, `switchAccount()`. The database's `current_account_id()` is the truth; the client mirrors it.
- `*.functions.ts`: server functions. Signed-in ones use `requireSupabaseAuth` (RLS applies as the user). Public ones use the publishable key and call token functions only. Never use `supabaseAdmin` (service role) unless the task brief says so.
- AI calls (`manual-qa`, `task-translation`) check `feature_enabled()` and `bump_usage()` first.
- `data.ts`: shared types and pure logic; add a test in `data.test.ts` when you change it.

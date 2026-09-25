---
name: rls-audit
description: Check who can read and change what in the MyChata database, using the in-memory test harness. Use when asked whether data is private, before releases, or when a policy looks wrong.
---

1. `bun run test:db` (security, before-fix and policy-lint tests on all migrations).
2. For a specific question, add a focused test to `supabase/tests/security.test.ts` using `as(db, {role, userId, email}, q => ...)` from `harness.ts`; fixtures exist for two accounts (A family, B institution) and anon.
3. Read `docs/generated/schema.md` for the current policies and which functions anon can execute.
4. Answer with a small table: actor × action → allowed/refused, and the test that proves each line.

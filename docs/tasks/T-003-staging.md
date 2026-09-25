# T-003 Staging database and test accounts

Status: todo · Needs: a second Supabase project you control (or Supabase branching)

Goal: a copy of the schema with seed data only, for agents and e2e tests; production is never the first place a migration runs.
Steps: create project → apply all migrations in order (supabase/migrations, then drizzle/migrations by journal) → load `supabase/seed.sql` (write it from the fixtures in `supabase/tests/security.test.ts`) → create 4 test users (family admin, family member, institution admin, newcomer) → store their credentials as GitHub secrets for T-004 → add a CI job that runs `supabase gen types` against staging and fails if `src/integrations/supabase/types.ts` differs.
Acceptance: `bun run e2e` with `E2E_BASE_URL` pointing at a preview on staging.

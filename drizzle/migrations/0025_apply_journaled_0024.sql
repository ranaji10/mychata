-- Empty marker migration: triggers the migrator to apply the already-journaled
-- drizzle/migrations/0024_checklists_and_defaults.sql exactly as written (T-018).
-- Intentionally no SQL here; per project rule 3a, never duplicate an existing migration.
select 1;
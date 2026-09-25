# ADR-0003 `drizzle/migrations` is the only migration folder

Status: accepted · Date: 2026-09-25

## Context

Two folders existed: `supabase/migrations` (the first two files, 8 Sep) and `drizzle/migrations` (0000–0010, used by Lovable since). Agents didn't know which to use; one brief even said "run it in the SQL editor".

## Decision

New migrations go only into `drizzle/migrations` with a journal entry. `supabase/migrations` is frozen. The SQL editor is never used for schema changes.

## Consequences

`supabase/tests/harness.ts` applies both folders in historical order to reproduce the real schema. If Lovable changes how it applies migrations, revisit.

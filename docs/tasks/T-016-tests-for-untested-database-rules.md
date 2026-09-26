# T-016 Tests for database rules that have none

Owner: planner writes, implementer builds · Status: todo

Goal: every rule the database enforces has a test in `supabase/tests/security.test.ts`.
Non-goals: no migration changes unless a test exposes a defect (then a separate task).
Files allowed: `supabase/tests/security.test.ts`.
Invariants touched (AGENTS.md): 1, 2.
Context: `docs/generated/schema.md`, ADR-0005.

Rules without a test today:

1. `feature_enabled()` off → guest and anonymous institutional forms refuse inserts (`guard_public_form` trigger).
2. `audit_log` gets a row on member role change and on booking / guest request / institutional request status change (`audit_decisions`).
3. `public_flag_manual_section` caps open flags at 20 per section and only for PUBLIC sections.
4. Institutional form: 50 requests per chata per day and 3 per email per day.
5. `rotate_public_token` / `set_public_calendar` require admin of that chata's account.
6. `consent_log` insert only for own user id or anonymous (migration 0010).
7. Owner role cannot be changed (`set_member_role` → `owner_role_is_fixed`).

Acceptance (runnable):

- `bun run test:db` passes with one test per rule above
- `bun run check` passes
  Handoff note: what changed, what was verified and how, what is still unverified.

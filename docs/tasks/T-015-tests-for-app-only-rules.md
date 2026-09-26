# T-015 Tests for rules only the app enforces

Owner: planner writes, implementer builds · Status: todo

Goal: every product rule enforced only in TypeScript lives in one named constant and has a unit test.
Non-goals: no behaviour change; no database changes; no moving database-enforced rules into TypeScript.
Files allowed: `src/lib/consent.tsx`, `src/lib/consent.test.ts`, `src/routes/onboarding.tsx`, `src/lib/data.ts`, `src/lib/data.test.ts`, `src/lib/task-translation.functions.ts`, `src/lib/manual-qa.functions.ts`, `src/lib/limits.ts` (new), `src/lib/limits.test.ts` (new).
Invariants touched (AGENTS.md): 5, 6.
Context: `src/lib/AGENTS.md`, `docs/architecture/tenancy-and-security.md`.

Rules without a test today:

1. Consent choice expires after 12 months and on version change (`CONSENT_VERSION`, `TWELVE_MONTHS_MS` in `src/lib/consent.tsx`).
2. Institutional sign-up blocks public email domains (`PUBLIC_DOMAINS`, inline in `src/routes/onboarding.tsx`; move to an exported constant + pure helper).
3. AI daily limits: task translation 200/day is an inline literal in `task-translation.functions.ts`; manual Q&A limit is inline in `manual-qa.functions.ts`. Move both to named constants in one file (the counting itself stays in `bump_usage()`).
4. Analytics holding queue is capped at 200 events (`src/lib/analytics.ts`).

Acceptance (runnable):

- `bun run test` passes with new tests for rules 1–4
- `bun run check` passes
  Handoff note: what changed, what was verified and how, what is still unverified.

# T-039 After the T-038 publish: records, two small fixes, test updates

Owner: Claude · Status: review

Goal: bring the repo's records in line with what is live after the T-038 publish (`d52dfd0`, 18 Oct) and close the small gaps found re-reading every change from `9e52d10` to `b50a296`.
Non-goals: D-16, D-22 to D-25, anything needing a migration, the cookie banner's size (F-03).
Files allowed: `src/routes/kalendar.tsx`, `src/routes/rezervace.$id.tsx`, `src/lib/t038.test.ts`, `tests/e2e/public.spec.ts`, `playwright.config.ts`, `.claude/agents/site-check.md`, `docs/STATUS.md`, `docs/external/claude/2026-09-25-critical-review*.md`, `docs/external/claude/README.md`, `docs/external/claude/2026-10-18-lovable-prompt-22.md`, `docs/tasks/T-038-live-test-fixes.md`, this file.
Invariants touched (AGENTS.md): 5 (new toast through `t()`), 6 (a read error is reported as such).

Changes:

- Records: `docs/STATUS.md` and the tracker said `a8b0b84` was live, T-038 "not published" and `release-2026-10-18` still to be set. In fact `d52dfd0` is live (site check 2, 18 Oct) and `release-2026-10-18` already exists on `9fce136` (set 17 Oct 22:57 UTC).
- Calendar page: a member whose re-read of the calendar flag fails (network) was told "the public calendar is switched off". Now "Odkaz se nepodařilo načíst.", as Settings already does.
- Stay page: an admin deciding a held stay no longer reads "Správce rozhodne a uvidíte to tady." (meant for the member who asked; family admins see it since T-038).
- Docs index (`docs/external/claude/README.md`): the artifacts table had lost its padding and carried a misplaced 5-column row (PR #46 review), so it no longer rendered as a table; the row is back in "Reviews and site checks". Lovable prompt 22 for the publish.
- Tests: unit tests for `localISO` and `manualCategoryLabel`; e2e checks the Czech titles of `/auth` and an invalid calendar link (guards Knowledge rule 13); `PW_CHROMIUM_PATH` lets cloud sessions run `bun run e2e` without a throwaway config.

Acceptance (runnable):

- CI on the PR (lint, types, format of changed files, all tests including the database tests, generated docs, build, e2e against the preview)
- After the next publish: `E2E_BASE_URL=https://mychata.cz bun run e2e` passes, 7 tests.

Handoff note: written from a cloud session that could not install dependencies (the Lovable registry rewrite is blocked here), so `bun run check` was not run locally; CI is the check. Not verified in a browser: both UI changes are a condition and a toast.

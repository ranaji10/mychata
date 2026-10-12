# T-023 CI, nightly check and status cleanup (CC-0)

Owner: Claude Code · Status: review · Prompt: CC-0 (`prompts/2026-10-04/01-CC-0-ci-and-status-cleanup.md`, outside the repo)

Goal: the nightly production check is green again, Lovable's unformatted pushes no longer turn CI red, and the docs say what is live.
Non-goals: migrations; application code under `src/`; rewriting history; GitHub settings (the owner sets them on the website).
Invariants touched (AGENTS.md): 3 (first PR under the rulesets on `main`), 4 (the old text of step 6 stays in history), 7 (personal data removed from a doc).
Context: `docs/STATUS.md`, `docs/external/claude/2026-09-25-critical-review.md` ("Open defects"), `docs/runbooks/two-person-workflow.md`, `docs/tasks/T-022-live-test-29-sep.md`, ADR-0007.

Background (checked 4 Oct, confirmed 12 Oct): production runs `main` up to PR #14 plus Lovable's L-1 commits of 29 Sep. The nightly check has failed every night since 29 Sep because `tests/e2e/public.spec.ts` "an unknown share token shows no calendar data" expects "Upcoming stays|Nadcházející pobyty", while since T-022 an unknown calendar link says "Tento odkaz na kalendář neplatí" / "This calendar link is not valid".

## Steps

1. **Nightly check.** That test expects the not-valid message (`/not valid|neplatí/`) and no booked days. Keep the other five tests; adjust any that fail against https://mychata.cz for the same kind of reason and name them in the PR.
2. **Formatting in CI** (`.github/workflows/ci.yml`):
   - `pull_request`: Prettier checks only the files the PR changes (`git diff --name-only --diff-filter=ACMR origin/main...HEAD`, limited to what Prettier handles). Lint, typecheck, all tests, docs:check, the migration guard and the bundle check stay as strict as now.
   - `push` to `main`: the full format check runs but only warns (a `::warning` annotation listing the files).
   - The job stays named `check` (the ruleset requires that exact name). `bun run check` locally keeps the full format check.
3. **Permissions.** `permissions: contents: read` at the top of `ci.yml` and `nightly-production-check.yml`.
4. **Dependabot.** Remove the npm block (its updates fail because `bun.lock` points at Lovable's private registry); a comment says to bring it back with own hosting (T-002). Keep github-actions monthly.
5. **STATUS.md.** Production = `main` up to PR #14 plus Lovable L-1 (29 Sep), no release tag. Database = migrations up to 0025 applied (0021 and 0025 are empty markers, 0023 is Lovable's copy of 0022). CI and the nightly check as they are after this PR. Open bugs from the critical review's "Open defects" table. T-017, T-019, T-021, T-022 and T-018 rows say merged and live, with T-022's list of things not yet tested live. Briefs T-018, T-019, T-021, T-022: Status = "done, live; see STATUS.md for what is untested".
6. **Personal data.** `T-022-live-test-29-sep.md` names a maintainer's personal email address; replace it with "a maintainer's admin account". No history rewrite; the PR says the old text stays in git history.
7. **Lovable Knowledge rule 3a.** The marker is a new file with the next free number whose only SQL is `select 1;` plus a comment naming the migration it triggers; never copy SQL from another migration (0023 was a copy). The PR reminds the owner to paste the file into Lovable's Knowledge again.
8. **Two-person runbook**, section "GitHub settings the repository owner sets once": rulesets exist since 3 Oct; the required check is named `check`; "Require extra approval for unattributed changes" must be off (Claude's commits aren't linked to a GitHub account); turn on "Always suggest updating pull request branches", "Automatically delete head branches" and secret-scanning push protection.
9. **Copies of the Claude docs.** Replace both files in `docs/external/claude/` with the ones in `../prompts/2026-10-04/copies/`. Content unchanged; Prettier may reformat them.

Files allowed: `tests/e2e/public.spec.ts`, `.github/workflows/ci.yml`, `.github/workflows/nightly-production-check.yml`, `.github/dependabot.yml`, `docs/STATUS.md`, `docs/tasks/T-018-checklists-and-defaults.md`, `docs/tasks/T-019-invites-sign-in-review.md`, `docs/tasks/T-021-walkthrough-fixes-28-sep.md`, `docs/tasks/T-022-live-test-29-sep.md`, `docs/tasks/T-023-ci-and-status-cleanup.md`, `docs/external/lovable/KNOWLEDGE.md`, `docs/runbooks/two-person-workflow.md`, `docs/external/claude/2026-09-25-critical-review.md`, `docs/external/claude/2026-09-26-review-prompts.md`. Anything else: stop and ask.

Acceptance (runnable):

- `bun run check` passes; output pasted in the PR.
- `E2E_BASE_URL=https://mychata.cz bun run e2e` passes; output pasted in the PR.
- The reviewer subagent has reviewed the diff (`prompts/2026-10-04/09-every-PR-review.md`).
- The PR lists (a) what was not verified, (b) after merge: run "Nightly production check" once by hand (Actions → Run workflow) and confirm it is green, (c) whether the PR needed an approval to merge; if it did, the ruleset's "unattributed changes" setting is still on.

Questions for a human:

- The same personal address is also in `.lovable/plan/my-chata-analytics-accounts-onboarding-and-growth-plan-2026-09-25.md` (line 16, with a name and sign-up time). That file is outside this brief's allowlist and is Lovable's scratch space. Remove it there too?

Handoff note: filled in by the PR description.

# T-071 Flag what Lovable changes beyond its prompt

Owner: Claude (planner and implementer) · Status: review

Goal: a check on every "lovable-sync → main" PR that names each file Lovable changed beyond what its prompt asked (asked 10 Nov after PR #120 also changed `previewAuthStorage.ts`).
Non-goals: no blocking (the required check stays "check"); no change to the sync workflow; no judgement of the changes themselves.
Files allowed: `scripts/lovable-scope.ts`, `scripts/check-lovable-scope.ts`, `scripts/lovable-scope.test.ts`, `.github/lovable-scope.json`, `.github/workflows/ci.yml`, `docs/runbooks/two-person-workflow.md`, `docs/STATUS.md`, this file.
Invariants touched (AGENTS.md): 3 (branches and PRs), 4 (nothing rewrites Lovable's history: the check only reads).
Context: `docs/runbooks/two-person-workflow.md` (Branches; Lovable platform updates), `scripts/sync-lovable.sh`, T-066.

Design:

- The prompt's scope is `.github/lovable-scope.json` (`prompt`, `allow` globs), set by the PR that adds the prompt and read from `main`, so Lovable's branch can't widen it.
- The check takes every file the PR changes against `main` (`git diff base...HEAD`, so changes inside merges count) and flags each one outside `allow`. Lovable's platform files (`src/integrations/**`, `src/routeTree.gen.ts`, `.lovable/**`, `package.json`, `bun.lock`) are flagged apart, as the runbook accepts them. The scope file itself is always flagged.
- Job `lovable-scope` in `ci.yml`, only on PRs from `lovable-sync` or the sync workflow's manual CI run on `lovable-sync`; it fails (red, with a summary and annotations) but is not the required check.

Acceptance (runnable):

- `bun run check` passes; `scripts/lovable-scope.test.ts` passes.
- Replay of PR #120 with the 33-L scope: only `previewAuthStorage.ts` flagged, as a platform file, exit 1.
- Replay of the 3 Nov Lovable round with no scope: the app files, `roadmap.md` and the Lovable doc flagged as not asked for.
- Next Lovable PR: the job appears on the PR and its summary lists what it found (live, unverified until then).

Handoff note: see the PR's Verification section.

# T-031 Keep lovable-sync current after every merge

Owner: Claude · Status: review

Goal: Lovable works from `lovable-sync`, which falls behind `main` after every merge (on 14 Oct Lovable's history stopped at PR #33). Move it up automatically, without ever overwriting Lovable's own work.
Non-goals: no change to the rulesets, Lovable's settings or the CI job `check`.
Files allowed: `.github/workflows/sync-lovable.yml`, `docs/runbooks/two-person-workflow.md`, `docs/STATUS.md`, this brief.
Invariants touched (AGENTS.md): 3 and 4 (no push to `main`; only a fast-forward of `lovable-sync`, never a force push).
Context: `docs/runbooks/two-person-workflow.md`, `docs/external/claude/2026-09-25-critical-review.md` (14 Oct chain of events).

Acceptance (runnable):

- On a push to `main`: if `lovable-sync` is an ancestor of `main`, it is moved to `main` (fast-forward push); if equal, nothing; if it has commits not on `main`, nothing is pushed and the run ends with a warning and a job summary. Checked against a scratch repository for all three cases.
- The workflow asks for `contents: write` and writes only `refs/heads/lovable-sync`; `ci.yml` keeps `contents: read`.
- `bun run check` passes.

Handoff note: verified in a scratch repository, not yet on GitHub: the first real run is the merge of this PR. If the repository's Actions setting blocks write tokens, the run fails with a 403; then Settings → Actions → General → Workflow permissions needs "Read and write" (or the workflow is dropped).

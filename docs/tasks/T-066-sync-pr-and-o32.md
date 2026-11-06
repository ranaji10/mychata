# T-066 Clear form errors (O-32), Lovable PRs opened automatically

Owner: Claude (cloud session) · Status: review

Goal: the maintainer's calls of 6 Nov 2026: (1) the sync workflow opens the PR "lovable-sync → main" by itself, so Lovable never silently stops getting merges again; (2) fix O-32, server-side input refusals that reached users as a stuck button or raw JSON.

Non-goals: other forms (they call database functions, which already return codes handled by `friendlyError`); server-side changes to the zod schemas; Lovable's own settings.

Files allowed: `.github/workflows/sync-lovable.yml`, `.github/workflows/ci.yml` (input `changed_only`), `scripts/sync-lovable.sh` (new), `src/lib/form-checks.ts` (new), `src/lib/t066.test.ts` (new), `src/routes/host.$token.tsx`, `src/components/AskBox.tsx`, `src/routes/dokumenty.tsx`, `docs/runbooks/two-person-workflow.md`, `docs/STATUS.md`, tracker copies, this brief.

Invariants touched (AGENTS.md): 3 (the workflow never pushes to `main`, never force-pushes; it merges `main` into `lovable-sync` with a merge commit), 4, 5 (all text through `t()`), 6 (no failure without a message).

## What changes

1. `sync-lovable.yml` runs on pushes to `main` and `lovable-sync`. `scripts/sync-lovable.sh`: behind → fast-forward (as before); Lovable commits not on `main` → merge `main` into `lovable-sync` when `main` moved (conflict: nothing pushed, warning), open the PR if none is open (body lists Lovable's commits and files, flags `drizzle/migrations/`), and start CI on `lovable-sync` with `changed_only=true`, because pushes and PRs made with the workflow's token start no workflows. Tested on a local copy with a fake `gh`: equal, behind, ahead, diverged with an open PR, conflict, after merge.
2. CI's manual run takes `changed_only`: formatting is then checked only for files changed against `main`, as on a PR (Lovable doesn't run Prettier).
3. O-32: `form-checks.ts` repeats the guest request rules (zod's own e-mail pattern, compared in the test) without bringing zod into the browser. The guest link form checks before sending and names the field, catches a refused or failed send, always ends busy, and limits name 120, e-mail 200, note 1000 (counter near the end). The House manual box has `maxLength` 500; `serverErrorText` turns a ZodError into a sentence there and in Document Vault's "Read again".

## Acceptance

- `bun run check` (incl. `src/lib/t066.test.ts`: the browser rules give the same verdict as the server's zod schema on 15 samples).
- Repository setting: Settings → Actions → General → Workflow permissions → "Allow GitHub Actions to create and approve pull requests" ticked (only the owner can).
- Next Lovable push that adds a commit not on `main`: a PR "Lovable: …" appears with CI running.
- After publish, on a test cottage's guest link: "jan@seznam" → "Please check the email address."; nothing is sent.

Handoff note: in the PR.

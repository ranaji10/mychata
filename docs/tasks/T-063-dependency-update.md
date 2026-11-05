# T-063 Dependency security update and Dependabot for npm

Owner: Claude (cloud session) · Status: review

Goal: clear the open npm advisories that a patch or minor version fixes, and let Dependabot open its own update pull requests that a maintainer merges on a green CI.

Route chosen (5 Nov 2026, chat): Claude makes the update in a pull request (CI proves install, tests and build); Lovable only takes it over from `lovable-sync`, rebuilds its preview and reports. Lovable doing the update itself would write its private cache URLs into `bun.lock` again and may move packages Claude can't check.

Non-goals: major versions (zod 3 → 4 for GHSA-mrhx-c7xc-m3w5: backlog O-31), Lovable's own packages, own hosting (T-002).

Files allowed: `bun.lock`, `package.json` (only versions `bun audit fix` changes), `.github/dependabot.yml`, `docs/runbooks/dependency-updates.md`, `docs/architecture/environments.md`, `docs/STATUS.md`, this brief.

Invariants touched (AGENTS.md): none (no app code, no schema).

## Changes

1. `bun.lock`: the 129 entries with Lovable cache URLs name the default registry (`""`), same versions and integrity hashes (separate commit, no version change).
2. `bun audit fix` within ranges: seroval 1.6.11 (runtime, SSR serialisation), vite 8.1.6, shell-quote 1.11.0, launch-editor 2.14.2, source-map-js 1.2.2, nanoid 3.3.18, brace-expansion, picomatch. 28 advisories → 6, all of them build or dev tools except zod 3 (major).
3. Dependabot: `bun` ecosystem weekly, minor and patch grouped, 3-day cooldown, majors and Lovable's framework set ignored; security updates grouped.

## Acceptance

- `bun run check`, `bun run build`, `bun audit` (6 left, listed in the PR)
- GitHub's Dependabot config check on this PR is green
- After merge: Lovable prompt `prompts/2026-11-05/28-L-dependency-update.md` (maintainers' folder)

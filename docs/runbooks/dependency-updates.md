# Dependency updates

Since T-063 (6 Nov 2026) Dependabot keeps the npm packages current (`.github/dependabot.yml`).

## What happens on its own

- **Every Monday 06:00 (Prague)** Dependabot opens at most one pull request with all minor and patch updates ("deps: bump the minor-and-patch group…"). Versions younger than 3 days are skipped (supply-chain guard, like `minimumReleaseAge` in `bunfig.toml`).
- **Security fixes** arrive as their own pull request as soon as GitHub knows of them, once "Dependabot security updates" is on (repo Settings → Code security). Without it, alerts appear under Security → Dependabot and the weekly run picks up the fix if it is a minor or patch version.
- **Not touched by Dependabot:** major versions (planned as a task), Lovable's packages (`@lovable.dev/*`) and the set Lovable upgrades together (TanStack Start, Router and router plugin, Vite, Nitro). Lovable updates those in its own pull request.
- GitHub Actions: monthly, as before.

## What a maintainer does

1. Open the Dependabot pull request. Wait for the check `check` (CI: install, lint, types, all tests, generated docs, build).
2. Green → **Merge**. Red → leave it and tell Claude the PR number; don't merge.
3. The merge reaches Lovable through `lovable-sync` (workflow "Keep lovable-sync current"). The update goes live with the next **Publish** in Lovable. Nothing needs publishing the same day unless the PR says "security".
4. After a publish that included a dependency PR, the nightly production check runs as usual; a quick look at mychata.cz (sign in, Home, Calendar) is enough.

Two Dependabot PRs open at once both change `bun.lock`: merge one, then comment `@dependabot rebase` on the other (or wait; it rebases itself).

## When a Dependabot run fails

Dependabot → "Last checked" in the repo's Insights → Dependency graph → Dependabot shows the log. The likely cause is Lovable's cache URLs back in `bun.lock` for a package being updated. Fix in a pull request: replace each whole URL `"https://…-npm.pkg.dev/lovable-core-prod/…tgz"` with `""` (same integrity hash, default registry), CI green, merge. Claude can do it.

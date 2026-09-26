# Two maintainers, one repo

Two partners push to this repo, plus Lovable and coding agents. These rules keep them from overwriting each other or production.

## Who does what

| Area                                                       | Rule                                                                                                                                                                                                    |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Merging to `main`                                          | Either maintainer merges their own PR once CI is green and the branch is up to date with main. No approvals needed; for migrations, auth, RLS or billing, tell the other person in chat before merging. |
| Lovable                                                    | One Lovable operator at a time. Say "Lovable is mine until …" in your chat before you start a Lovable session.                                                                                          |
| Migrations                                                 | One open migration PR at a time across both of you. Claim the next number in chat before you write it.                                                                                                  |
| Publishing (Lovable → mychata.cz) and tagging              | Whoever publishes runs `release.md` to the end: five checks, tag, STATUS.md.                                                                                                                            |
| Secrets (Lovable Cloud, Google, AI keys, database exports) | Never in the repo, chat or task briefs. Each maintainer keeps their own copy of the backup (`backup.md`).                                                                                               |

## Branches

- Your own work: `<your-github-name>/<task-id>-<short-name>`, e.g. `ranaji10/T-012-demo-data`.
- Agents: `agent/<tool>/<task-id>` (AGENTS.md invariant 3).
- Lovable edits `main` directly while production is hosted by Lovable (ADR-0007, Model A). That is the only direct push to `main`.
- Start every piece of work with `git checkout main && git pull`, then branch. Delete your branch after it is merged.

## Am I up to date? (`scripts/sync-check.sh`)

Runs by itself when you open the folder in VS Code, before every commit and before every push. It only reads git; it never changes your files.

| It tells you                                                                              | When it blocks                                      |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Your main is behind GitHub, or your branch was merged and deleted                         | Never (warning)                                     |
| main has newer commits that change files you're changing                                  | On push: merge main first (`git merge origin/main`) |
| Someone's unmerged branch changes the same files as you (who, when, which files)          | Never (warning: talk first)                         |
| Your new migration number is already used on main or an open branch; the next free number | On commit and push                                  |
| You're committing on main                                                                 | On commit                                           |
| Lovable pushed to main in the last 24 h                                                   | Never (info)                                        |

One-time setup per person and per computer:

1. `git config core.hooksPath .githooks` in the repo folder (the VS Code task also does this).
2. In VS Code, when asked "Allow automatic tasks in this folder?", choose Allow. Or run it any time: Terminal → Run Task → "MyChata: sync check", or `bash scripts/sync-check.sh`.
3. Settings → search "autofetch" → turn on **Git: Autofetch**, so VS Code's branch indicator shows incoming changes.

Skip it once (e.g. offline): `SKIP_SYNC_CHECK=1 git commit …`. Agents run it at the start of every session (AGENTS.md).

## What CI already stops

- Duplicate migration numbers, gaps, a migration missing from `meta/_journal.json`, and edits to a migration that is already on `main` (`scripts/check-migrations.ts`).
- Lint, types, formatting, all tests, stale generated docs, and a browser bundle without the Supabase settings (B-002).

## GitHub settings the repository owner sets once

These can't be set from a pull request. They need the owner's account, in the GitHub website.

1. **Add the partner.** Settings → Collaborators → Add people → role **Write** (Maintain if they should manage issues and releases too). Admin stays with the owner.
2. **Protect `main` with a ruleset.** Settings → Rules → Rulesets → New branch ruleset, target `main`:
   - Restrict deletions, block force pushes (already on).
   - Require a pull request before merging, **0 required approvals** (decided 26 Sep: each of you merges your own PRs).
   - Require status checks to pass: `check` (the CI job), and tick **Require branches to be up to date before merging**, so nothing merges that was tested against an old main.
   - Bypass list: the **Lovable** GitHub App, so Lovable can keep syncing to `main` under Model A. Without it, Lovable's pushes are rejected and its editor goes out of sync.
   - Check afterwards: make a tiny text change in Lovable and confirm it appears on `main`.
3. **Code owners, optional** (after step 1, when both usernames are known). This only auto-requests the other person as a reviewer, so they get notified; it doesn't block merging as long as "Require review from Code Owners" stays off. Create `.github/CODEOWNERS` in a PR with:

   ```
   /drizzle/migrations/   @ranaji10 @<partner>
   /supabase/             @ranaji10 @<partner>
   /src/lib/*.functions.ts @ranaji10 @<partner>
   /.github/              @ranaji10 @<partner>
   /AGENTS.md             @ranaji10 @<partner>
   ```

   Leave "Require review from Code Owners" off, in line with the no-approvals decision.

4. **Notifications.** Both maintainers: Watch → All activity, so failed CI and the nightly production check reach both of you.

## Tags

- `baseline-YYYY-MM-DD`: the state of `main` when something changes hands (a new maintainer, a hosting move). Any maintainer can create one.
- `release-YYYY-MM-DD`: only after the five checks in `release.md` pass on that exact commit.

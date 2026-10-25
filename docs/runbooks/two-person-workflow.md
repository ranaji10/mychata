# Two maintainers, one repo

Two partners push to this repo, plus Lovable and coding agents. These rules keep them from overwriting each other or production.

## Who does what

| Area                                                       | Rule                                                                                                                                                                                                                                                         |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Merging to `main`                                          | Anna merges for now (D-04, 25 Oct), once CI is green, the branch is up to date with main and the reviewer report shows real `bun run check` output. No approvals needed; for migrations, auth, RLS or billing, tell the other person in chat before merging. |
| Lovable                                                    | One Lovable operator at a time. Say "Lovable is mine until …" in your chat before you start a Lovable session.                                                                                                                                               |
| Migrations                                                 | One open migration PR at a time across both of you. Claim the next number in chat before you write it.                                                                                                                                                       |
| Publishing (Lovable → mychata.cz) and tagging              | Whoever publishes runs `release.md` to the end: five checks, tag, STATUS.md.                                                                                                                                                                                 |
| Secrets (Lovable Cloud, Google, AI keys, database exports) | Never in the repo, chat or task briefs. Each maintainer keeps their own copy of the backup (`backup.md`).                                                                                                                                                    |

## Branches

- Your own work: `<your-github-name>/<task-id>-<short-name>`, e.g. `ranaji10/T-012-demo-data`.
- Agents: `agent/<tool>/<task-id>` (AGENTS.md invariant 3).
- Lovable works on the branch `lovable-sync` (its GitHub setting since 14 Oct; the ruleset refuses its pushes to `main`). Its work reaches `main` through a PR like everyone else's. After every merge into `main`, the workflow `.github/workflows/sync-lovable.yml` fast-forwards `lovable-sync` to `main`, so Lovable's next round starts from the latest code. If `lovable-sync` holds Lovable commits not yet on `main`, it is left alone and the run shows a warning: merge Lovable's PR first. To run it by hand: Actions → Keep lovable-sync current → Run workflow.
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
- Lint, types, all tests, stale generated docs, and a browser bundle without the Supabase settings (B-002).
- Formatting, but only of the files your pull request changes. Lovable doesn't run Prettier, so its pushes to `main` get a warning listing the unformatted files instead of a red CI (since T-023; on 29 Sep two such pushes turned every open PR red). `bun run check` on your computer still checks everything; `bun run format` fixes it.

## GitHub settings the repository owner sets once

These can't be set from a pull request. They need the owner's account, in the GitHub website. State on 12 Oct 2026, read through GitHub's API: step 2 is done and the three settings in step 3 are on.

1. **Add the partner.** Settings → Collaborators → Add people → role **Write** (Maintain if they should manage issues and releases too). Admin stays with the owner.
2. **Protect `main` with a ruleset.** Two rulesets on `main` hold the rules below (first set up 3 Oct 2026; the current two were created 12 Oct); change them under Settings → Rules → Rulesets.
   - Restrict deletions, block force pushes.
   - Require a pull request before merging, **0 required approvals** (decided 26 Sep: each of you merges your own PRs).
   - Allowed merge method: merge commits only.
   - Require status checks to pass: the check named exactly `check` (the job in `.github/workflows/ci.yml`; renaming that job, or giving it a matrix, changes the name and blocks every merge), and tick **Require branches to be up to date before merging**, so nothing merges that was tested against an old main.
   - Bypass list: the **Lovable** GitHub App. It turned out not to help: Lovable pushes as the `ranaji10` user, not as its app, so its pushes to `main` are refused. That is why Lovable works on `lovable-sync` (see Branches).
   - **Require extra approval for unattributed changes** must stay **off**. Claude's commits aren't linked to a GitHub account, so with it on every agent PR needs an approval, against the 0-approvals decision. If an agent PR asks for an approval before it can merge, this setting is on.
   - Check afterwards: make a tiny text change in Lovable and confirm it appears on `lovable-sync`, then in a PR into `main`.
3. **Three repository settings that must be on** (all three were on when checked 12 Oct).
   - Settings → General → Pull Requests → **Always suggest updating pull request branches**: gives every PR an "Update branch" button, which the up-to-date rule above makes you need whenever `main` moved.
   - Settings → General → Pull Requests → **Automatically delete head branches**: merged branches disappear by themselves.
   - Settings → Advanced Security (called "Code security" in some accounts) → secret scanning → **Push protection**: GitHub refuses a push that contains a recognisable key or token. The repository is public, so this is free.
4. **Code owners, optional** (after step 1, when both usernames are known). This only auto-requests the other person as a reviewer, so they get notified; it doesn't block merging as long as "Require review from Code Owners" stays off. Create `.github/CODEOWNERS` in a PR with:

   ```
   /drizzle/migrations/   @ranaji10 @<partner>
   /supabase/             @ranaji10 @<partner>
   /src/lib/*.functions.ts @ranaji10 @<partner>
   /.github/              @ranaji10 @<partner>
   /AGENTS.md             @ranaji10 @<partner>
   ```

   Leave "Require review from Code Owners" off, in line with the no-approvals decision.

5. **Notifications.** Both maintainers: Watch → All activity, so failed CI and the nightly production check reach both of you.

## Decisions of 25 Oct (T-045)

- **Lovable's "Fix error" button (D-09):** don't press it. It writes straight to `lovable-sync`, and Publish puts that live without a PR or review. Describe the error in a normal prompt instead; the change then goes through the usual PR.
- **Ruleset History (D-13):** after every release tag, open Settings → Rules → Rulesets → each ruleset → History and check nobody changed it.
- **Force pushes on `lovable-sync` (D-14):** `main` blocks them ("main - protect" and the classic protection). `lovable-sync - keep` only blocks deletion. To close it: Settings → Rules → Rulesets → "lovable-sync - keep" → tick **Block force pushes** → Save. The sync workflow only fast-forwards, so it is not affected. If Lovable later fails to push (it would need a force push only after a history rewrite on its side), untick it and tell Claude.
- **Generated docs (D-17):** the pre-commit hook regenerates `docs/generated/` when a commit touches `drizzle/migrations/` or `src/routes/` (needs `git config core.hooksPath .githooks`, O-01). Lovable's commits skip hooks, so CI's check still catches those: run `bun run docs:gen` on the PR branch.

## Lovable platform updates

Lovable sometimes changes its own files in the same round as a prompt (17 Oct: `@lovable.dev/vite-tanstack-config` 2.25.3 → 2.26.5 with `bun.lock`, and `src/integrations/supabase/previewAuthStorage.ts`, while applying migration 0026). These are Lovable's platform files, so accept them, but keep them apart from our changes:

- Which files: `@lovable.dev/*` versions in `package.json` and their `bun.lock` lines, and every file under `src/integrations/` marked "automatically generated". Never edit them by hand (AGENTS.md).
- `previewAuthStorage.ts` only acts on Lovable's preview hosts inside the editor frame; on mychata.cz it returns plain `localStorage`.
- When a Lovable PR mixes a platform update with a migration or app change, say so in the PR and the tracker's history, and check CI's install and build steps passed (they rewrite Lovable's private registry URLs first).
- If a publish breaks right after such a round, suspect the platform update first: restore the previous version in Lovable, then ask Lovable to make the update on its own.
- Prompts to Lovable end with: "If you need a platform or dependency update, do it in a separate commit and name it in your reply."

## Tags

- `baseline-YYYY-MM-DD`: the state of `main` when something changes hands (a new maintainer, a hosting move). Any maintainer can create one.
- `release-YYYY-MM-DD`: only after the five checks in `release.md` pass on that exact commit.

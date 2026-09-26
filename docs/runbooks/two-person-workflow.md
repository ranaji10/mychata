# Two maintainers, one repo

Two partners push to this repo, plus Lovable and coding agents. These rules keep them from overwriting each other or production.

## Who does what

| Area                                                       | Rule                                                                                                            |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Merging to `main`                                          | Either maintainer, after CI is green. For migrations, auth, RLS, billing or `.github/`: the _other_ one merges. |
| Lovable                                                    | One Lovable operator at a time. Say "Lovable is mine until …" in your chat before you start a Lovable session.  |
| Migrations                                                 | One open migration PR at a time across both of you. Claim the next number in chat before you write it.          |
| Publishing (Lovable → mychata.cz) and tagging              | Whoever publishes runs `release.md` to the end: five checks, tag, STATUS.md.                                    |
| Secrets (Lovable Cloud, Google, AI keys, database exports) | Never in the repo, chat or task briefs. Each maintainer keeps their own copy of the backup (`backup.md`).       |

## Branches

- Your own work: `<your-github-name>/<task-id>-<short-name>`, e.g. `ranaji10/T-012-demo-data`.
- Agents: `agent/<tool>/<task-id>` (AGENTS.md invariant 3).
- Lovable edits `main` directly while production is hosted by Lovable (ADR-0007, Model A). That is the only direct push to `main`.
- Start every piece of work with `git checkout main && git pull`, then branch. Delete your branch after it is merged.

## What CI already stops

- Duplicate migration numbers, gaps, a migration missing from `meta/_journal.json`, and edits to a migration that is already on `main` (`scripts/check-migrations.ts`).
- Lint, types, formatting, all tests, stale generated docs, and a browser bundle without the Supabase settings (B-002).

## GitHub settings the repository owner sets once

These can't be set from a pull request. They need the owner's account, in the GitHub website.

1. **Add the partner.** Settings → Collaborators → Add people → role **Write** (Maintain if they should manage issues and releases too). Admin stays with the owner.
2. **Protect `main` with a ruleset.** Settings → Rules → Rulesets → New branch ruleset, target `main`:
   - Restrict deletions, block force pushes (already on).
   - Require a pull request before merging, 0 required approvals to start. Raise it to 1 once both of you work daily; with 1, neither of you can merge alone.
   - Require status checks to pass: `check` (the CI job).
   - Bypass list: the **Lovable** GitHub App, so Lovable can keep syncing to `main` under Model A. Without it, Lovable's pushes are rejected and its editor goes out of sync.
   - Check afterwards: make a tiny text change in Lovable and confirm it appears on `main`.
3. **Code owners** (after step 1, when both usernames are known): create `.github/CODEOWNERS` in a PR with:

   ```
   /drizzle/migrations/   @ranaji10 @<partner>
   /supabase/             @ranaji10 @<partner>
   /src/lib/*.functions.ts @ranaji10 @<partner>
   /.github/              @ranaji10 @<partner>
   /AGENTS.md             @ranaji10 @<partner>
   ```

   Then tick "Require review from Code Owners" in the ruleset. Both names must be listed, or the only owner can never approve their own PR.

4. **Notifications.** Both maintainers: Watch → All activity, so failed CI and the nightly production check reach both of you.

## Tags

- `baseline-YYYY-MM-DD`: the state of `main` when something changes hands (a new maintainer, a hosting move). Any maintainer can create one.
- `release-YYYY-MM-DD`: only after the five checks in `release.md` pass on that exact commit.

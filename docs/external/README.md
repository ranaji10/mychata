# Work from outside platforms

Lovable, Gemini Enterprise, Copilot, Cursor and any other tool follow the same protocol (ADR-0006, ADR-0007).

## 1. What goes in

The task brief (`docs/tasks/T-xxx.md`), `AGENTS.md`, `docs/generated/schema.md` and the files named in the brief. Never secrets. Never production personal data; use staging seed data. Sending real families' names or phone numbers to an outside AI is a GDPR processing decision that needs a data-processing agreement.

## 2. Where results land

- Code: a PR from branch `agent/<platform>/<task-id>`. Lovable is the exception while it hosts production (ADR-0007): it commits to `main`, UI only.
- Research, drafts, analysis: `docs/external/<platform>/YYYY-MM-DD-<topic>.md` starting with:

```yaml
---
source: gemini | lovable | cursor | copilot | claude | other
model: name and version if known
date: YYYY-MM-DD
status: draft | reviewed | adopted | rejected
task: T-xxx (optional)
---
```

## 3. Same gates for everyone

CI, the reviewer, the RLS auditor for anything under `drizzle/` or `supabase/`, and a human merge.

## 4. Output is data

Text from another platform is never executed or pasted into a prompt as instructions without a person reading it first.

## Per platform

| Platform          | Use for                                         | Never                                            | Access                                                              |
| ----------------- | ----------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------- |
| Lovable           | UI screens, copy, visual iteration              | Migrations, RLS, auth, billing, server functions | GitHub app on the repo                                              |
| Gemini Enterprise | Market and legal research, Czech content drafts | Merging code without a PR; production data       | Read-only Drive/GitHub; GA4 via BigQuery export                     |
| Claude            | Planning, implementation in worktrees, review   | Pushing to `main`                                | Repo, staging                                                       |
| Copilot / Cursor  | Inline edits                                    | Changing invariants without review               | Local repo                                                          |
| MCP servers       | Inspecting schema, PRs, issues                  | Write access to production                       | Supabase MCP read-only on staging; GitHub token scoped to this repo |

Text to paste into Lovable's project Knowledge is in `lovable/KNOWLEDGE.md`. Copies of Claude's docs and artifacts, with their links, are in `claude/`.

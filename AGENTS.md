<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

# MyChata: agent guide

Czech-first app for families and institutions that share a chata: calendar, tasks, expenses, handover, manual, documents. Live at mychata.cz. This file is the only always-loaded context; keep it under 150 lines and link out instead of copying.

## Stack

TanStack Start 1.168 (SSR on Cloudflare via Nitro) · React 19 · TanStack Router/Query · Tailwind 4 + shadcn · Supabase (Auth, Postgres + pgvector, Storage) · Bun · TypeScript strict. **Not Next.js**, no Supabase Edge Functions: server code is `createServerFn` in `src/lib/*.functions.ts` (ADR-0001).

## Commands

```
bash scripts/sync-check.sh   # FIRST, every session: is this copy current, who else is changing the same files
bun install            # CI rewrites Lovable's private registry URLs first, see docs/architecture/environments.md
bun run dev
bun run check          # lint + typecheck + format + all tests + generated-docs check. Must pass before a PR.
bun run test:db        # database security tests only (in-memory Postgres, no Docker)
bun run docs:gen       # after any migration or route change
```

## Invariants (breaking one = PR rejected)

1. **Tenancy.** Data belongs to an account. Policies use `current_account_id()`, `in_current_account()`, `is_admin()`, `is_member()`. Every SECURITY DEFINER function checks the caller or is in `supabase/security-allowlist.json` with a reason. Anonymous access only through token functions (`public_*`, `submit_*`).
2. **Schema.** Changes only as a new numbered file in `drizzle/migrations/` plus a `meta/_journal.json` entry. Never the SQL editor, never edit an applied migration. `supabase/migrations/` is frozen (ADR-0003).
3. **Branches.** No direct pushes to `main`. Work on `agent/<tool>/<task-id>`, open a PR, CI green, a human merges.
4. **History.** Never rewrite pushed history (Lovable sync, see block above).
5. **Language.** All user-facing text through `t("česky", "English")`; Czech first. Users are 45–68: 44px targets, plain words.
6. **Errors.** Every Supabase call handles `error`. Nothing fails silently.
7. **Secrets and data.** No keys in code or docs; no production personal data in tests, prompts or fixtures.

## Where things are

| Need                                         | Read                                        |
| -------------------------------------------- | ------------------------------------------- |
| Current state, what is verified, what's live | `docs/STATUS.md`                            |
| Tables, columns, policies, functions         | `docs/generated/schema.md` (generated)      |
| Routes and which are public                  | `docs/generated/routes.md` (generated)      |
| Look and feel, audience rules                | `docs/product/design.md`                    |
| Accounts, roles, public links                | `docs/architecture/tenancy-and-security.md` |
| House manual search                          | `docs/architecture/rag.md`                  |
| Plans and billing                            | `docs/architecture/billing.md`              |
| Hosting, env vars, local dev                 | `docs/architecture/environments.md`         |
| Why things are the way they are              | `docs/decisions/`                           |
| Your task                                    | `docs/tasks/T-xxx-*.md`                     |
| Work from Lovable, Gemini, others            | `docs/external/README.md`                   |
| Two maintainers: branches, merges, Lovable   | `docs/runbooks/two-person-workflow.md`      |

Files marked "automatically generated" in `src/integrations/` and `src/routeTree.gen.ts` belong to Lovable/the router plugin: don't hand-edit (exception: `types.ts` may be patched for new schema until Lovable regenerates it).

## Claude artifacts and docs

Every Claude artifact or doc made for MyChata gets a copy in `docs/external/claude/YYYY-MM-DD-<topic>.md` (frontmatter `artifact:` = its link) and a "Source file:" line at its end naming that path. Refresh the copy whenever you edit the artifact. Index: `docs/external/claude/README.md`.

## Before you finish

- `bun run check` passes; paste the output in the PR's Verification section.
- Behaviour changed? Update `docs/STATUS.md`. A decision made? Add an ADR.
- State what you did not verify.

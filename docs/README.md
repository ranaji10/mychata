# MyChata docs

Start with `STATUS.md`, then the file for your area. One fact lives in one file; others link to it.

| Folder          | Holds                                                      | Edited by                       |
| --------------- | ---------------------------------------------------------- | ------------------------------- |
| `STATUS.md`     | What is live, what is verified and how, open defects       | Whoever merges                  |
| `product/`      | Vision, users, pricing, market strategy                    | People                          |
| `architecture/` | How the system works today                                 | Anyone, via PR                  |
| `decisions/`    | Numbered ADRs; superseded ones are marked, never deleted   | Anyone, via PR                  |
| `tasks/`        | One brief per piece of work (template inside)              | Planner                         |
| `external/`     | Research and drafts from Lovable, Gemini and others        | Anyone; `status` in frontmatter |
| `bugs/`         | One file per bug, with a reproduction                      | Anyone                          |
| `runbooks/`     | Step-by-step operations: release, local dev, data clean-up | People                          |
| `generated/`    | Schema and routes, written by `bun run docs:gen`           | Nobody by hand                  |

`.lovable/plan/` is Lovable's scratch space; decisions found there get lifted into an ADR. Lovable's old build log and `roadmap.md` were removed on 2026-09-26 (duplicates of `STATUS.md`; history keeps them).

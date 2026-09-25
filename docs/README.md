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

`build-last-3-responses.md` is Lovable's own build log; `.lovable/plan/` is Lovable's scratch space. Decisions found there get lifted into an ADR.

# Claude artifacts and their copies

Claude docs and artifacts are the readable, shareable versions. The files here are copies that agents can read and git keeps history of. Claude refreshes a copy whenever it edits the artifact; if the two disagree, the artifact is newer.

| Date       | Artifact                                                                                                                 | Copy in this folder             |
| ---------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------- |
| 2026-09-25 | [MyChata MVP: critical review and V3 build system](https://claude.ai/code/artifact/de927c20-385c-481b-946a-49c085e87bf1) | `2026-09-25-critical-review.md` |
| 2026-09-26 | [MyChata: agent prompts from the 26 Sep review](https://claude.ai/code/artifact/7b07f9c1-14fd-4777-8538-cd684a70538e)    | `2026-09-26-review-prompts.md`  |
| 2026-10-14 | Site check and release readiness (local report, no artifact)                                                             | `2026-10-14-site-check.md`      |
| 2026-10-14 | PR #25 review (local report, no artifact)                                                                                | `2026-10-14-pr25-review.md`     |

Rule (AGENTS.md): every new artifact gets a row here, a copy with frontmatter `artifact: <link>`, and a "Source file:" line at the end of the artifact.

## Reviews and site checks

| Date       | Report                      | What was checked                               | Verdict                 | Open follow-ups                                                  |
| ---------- | --------------------------- | ---------------------------------------------- | ----------------------- | ---------------------------------------------------------------- |
| 2026-10-14 | `2026-10-14-site-check.md`  | Live site (mychata.cz), build 12627b5 or newer | 6/6 e2e pass, no errors | Version marker, signed-in release checks, Czech titles           |
| 2026-10-14 | `2026-10-14-pr25-review.md` | PR #25 (L-5b pages), last commit 72ab3ea       | Merge yes, after fixes  | Link previews (L-5c), season photo recheck, process improvements |

# T-037 Requests list after a reload

Owner: Claude · Status: review

Goal: a new public stay request shows on Requests and on Home right away, also after a full page reload (re-check of T-036 on 18 Oct).
Non-goals: realtime updates, other lists.
Files allowed: `src/routes/zadosti.tsx`, `src/routes/domu.tsx`, `docs/STATUS.md`, `docs/external/claude/2026-10-17-release-check.md`, `docs/runbooks/two-person-workflow.md`, this file.
Invariants touched (AGENTS.md): none.
Context: T-036 added `refetchOnMount: "always"` to the Requests list. Live on `9fce136` it works when moving between pages, but after a reload the offline copy is restored first and, if it is under a minute old (`staleTime` 60 s in `src/router.tsx`), counts as fresh, so the new request stayed hidden.

Fix: `staleTime: 0` on the Requests list and on Home's requests query (the "Pending requests" count).

Acceptance (runnable):

- `bun run check`
- After publish: open Requests, send a request on the public link, reload Requests within a minute: the request is listed.

Handoff note: typecheck and the full check pass; the reload behaviour itself is verified only after publish.

# T-056 Fixes from the review of Lovable's L-3 commits

Owner: Claude (cloud session) · Status: review

Goal: fix the Medium findings of `docs/external/claude/2026-11-03-lovable-commits-review.md` before PR #93 (L-3) is merged.
Non-goals: server functions, migrations, Low findings 5–8 (left for later).
Files allowed: `src/lib/rpc-errors.ts` (new), `src/lib/t056.test.ts` (new), `src/components/ExpenseDetail.tsx`, `src/components/TaskNotes.tsx`, `src/routes/rezervace.$id.tsx`, `src/routes/predani.tsx`, `src/routes/upozorneni.tsx`, `src/routes/manual.tsx`, `AGENTS.md`, `roadmap.md`, `docs/STATUS.md`, `docs/external/claude/*`, this brief.
Invariants touched (AGENTS.md): 5, 6.

Done:

1. Error codes (`nothing_owed`, `rate_limited`, `no_admin`, …) shown in plain Czech/English via `friendlyError()`; unknown errors still show the raw message.
2. "Napsat správci" only for non-admins (an admin writing to themselves got `no_admin`).
3. Editing a manual section keeps its place; only new sections go to the end.
4. Not fixable in the UI: onboarding passes one house-rules text, so starter rules land in one language. Needs a change to the onboarding function (follow-up, noted in STATUS).
5. Housekeeping: Lovable's AGENTS.md line removed; untested roadmap items unticked; Lovable's STATUS section moved below the table.

Acceptance: `bun run check` passes; `src/lib/t056.test.ts`.

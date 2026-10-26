# ADR-0012 Manual answers read the whole manual and documents, without embeddings, up to 150,000 characters per cottage

Status: accepted (26 Oct 2026, N-16) · Date: 2026-10-25 · From the CC-4 re-plan (T-044)

## Context

ADR-0004 designed hybrid vector search. T-021 (29 Sep) changed `askManual` to send a cottage's whole manual and document text to the model, best keyword matches first when it exceeds 150,000 characters, because missing embeddings had produced "no match". Embeddings are still computed on every manual save (`rebuildManualChunks`), but no answer reads them.

## Decision

- Keep full-text answers as the design while a cottage's manual plus documents fit in 150,000 characters (`MAX_CONTEXT_CHARS`).
- Stop calling `rebuildManualChunks` on save (a small code task); keep the table and function until T-020 decides their future.
- Build T-020's page-level chunks and citations only when real cottages exceed the budget (measure: total characters per property, logged by `askManual`), and T-007's queue only together with it.
- T-008's 40 test questions are needed in every option: without them nobody can tell whether answers are right.

## Done on acceptance (T-046)

- `manual.tsx` and `chaty.tsx` no longer call `rebuildManualChunks` after a save.
- `askManual` logs each question's context size (`[askManual] context size`: total characters, sources, how many were sent, over budget or not, any source cut to its own 60,000-character limit), with no text, in the hosting logs.

## Consequences

Fewer AI calls and less code to keep working now. Long documents beyond the budget are answered from keyword-ranked excerpts until T-020 ships. EU processing (ADR-0004's open question) is unchanged by this decision.

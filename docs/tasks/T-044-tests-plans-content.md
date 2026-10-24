# T-044 Prompts without dependencies, run 25 Oct 2026: CP-1 tests, CC-4 re-plan, G-1 content draft

Owner: Claude (cloud session) · Status: review

Goal: run the three prompts in `prompts/2026-10-04/` that wait for nothing: `04-CP-1-tests.md`, `08-CC-4-plan-document-search.md`, `03-G-1-czech-content.md`.
Non-goals: application code, migrations, CI. CP-1 allows test files only; CC-4 allows docs only; G-1's draft goes in for a person to correct before L-3 reads it.
Files allowed: `supabase/tests/t016.test.ts`, `src/lib/t015.test.ts`, `docs/architecture/rag.md`, `docs/decisions/ADR-0012-*.md`, `docs/tasks/T-007-*.md`, `docs/tasks/T-020-*.md`, `docs/tasks/T-044-*.md`, `docs/external/claude/2026-10-25-g1-content-draft.md`, `docs/external/claude/2026-10-25-pr66-review.md`, `docs/external/claude/README.md`.

## CP-1 (T-015, T-016)

- `supabase/tests/t016.test.ts`: one test per T-016 rule: switched-off public forms, audit rows for role/booking/guest-request decisions, 20-flag cap and PUBLIC-only flags, institution form 3/e-mail and 50/cottage a day, admin-only calendar switch and token rotation, consent log own-or-anonymous (and unreadable), owner role fixed. All 9 pass; no defect found.
- `src/lib/t015.test.ts`: consent expiry (12 months, version) in the app and in the head bootstrap, institutions' public-domain block, AI daily limits (200 translations, 30 questions, 40 document reads), and that the analytics holding queue no longer exists. The brief's refactor (one `limits.ts`) changes app code, so it is left for a code task.
- The T-018, T-021 and T-022 rules CP-1 lists were already covered by `security.test.ts` (checklists, cover_expense, task creator, member booking status, decide_guest_request, settle_debt, update_property_details, admin promotion) and `t021.test.ts`/`t026.test.ts`.

## CC-4 answers (evidence from the code)

1. **What one question sends today.** `askManual` (`src/lib/manual-qa.functions.ts`) reads, with the asker's session, every manual section (both languages) and every document of the cottage, including `extracted_text`; each source is cut at 60,000 characters and the whole at 150,000 (`MAX_SOURCE_CHARS`, `MAX_CONTEXT_CHARS` in `src/lib/manual-answers.ts`). Over the budget, sources are ranked by keyword matches with the question (and the previous one) and the best ones go first. Model: the newest Gemini Flash the Lovable gateway lists, then `AI_CHAT_MODEL`, then `gemini-3-flash-preview`, `gemini-2.5-flash`; 45 s time limit; up to 3 earlier turns. Up to 3 unread older uploads are read on the spot. Cost per question: unknown from the repo (Lovable credits; no price table in the code).
2. **Where full text stops working.** The model's context (about a million tokens for Gemini Flash) is not the limit; our 150,000-character budget is (about 40,000 tokens of Czech). A typical family cottage (20–40 manual sections, about 15,000–30,000 characters, plus a few short papers) fits whole. It stops fitting once documents are long: one 30-page insurance contract or deed is about 60,000 characters (cut there), so two or three long documents push the rest out and answers depend on keyword ranking. An institution with 20 properties is no different per question, because a question is scoped to one property; it matters only if one property holds many long documents. Latency grows with the prompt; the 45 s limit is the practical ceiling.
3. **T-007 / T-020.** Still needed now: nothing of T-007. Needed past the size above: chunking documents by page with citations (T-020 steps 4–6) and a search that picks chunks instead of whole documents. Obsolete now: embedding every manual save (`rebuildManualChunks` is still called from `manual.tsx` and `chaty.tsx`, but `search_manual` and `manual_chunks` are no longer read by any answer: AI calls with no use). T-020's upload drop zone and status display (T-020a) are independent of embeddings and already partly exist (`text_status`).
4. **Admin-only documents.** Respected: every read uses the caller's session (`context.supabase`), and the documents policy "Members read own visible documents" hides `ADMINS_ONLY` rows; storage files of such rows are admins-only (`is_admin_only_file`, migration 0013). Test: `security.test.ts` "members never read the text of admin-only documents".
5. **What leaves the EU.** The question, up to three earlier turns and up to 150,000 characters of manual and document text go to `ai.gateway.lovable.dev` (Lovable) and on to Google Gemini; reading a document sends the whole PDF or photo once. The privacy page says text goes to "Google Gemini via Lovable AI" but not where it is processed. D-15 (keep or switch off `ai_documents`) and ADR-0004's open question stay open.

Decisions that are the maintainers': a cost cap per account (questions and document reads), EU processing (Lovable gateway vs Google in an EU region), and whether to stop the unused embeddings (saves calls; ADR-0012 proposes it).

## G-1

The prompt was written for Gemini; Claude drafted it this time (`docs/external/claude/2026-10-25-g1-content-draft.md`, `source: claude`, `status: draft`). A native speaker reviews and corrects it, then a later PR adds `docs/content/house-rules-cs-en.md` and `docs/content/manual-questions-cs-en.md` for L-3.

Acceptance: `bun run check` passes.

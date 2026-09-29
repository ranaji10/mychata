# House manual search (RAG)

Stage 1, rebuilt on 2026-09-25 (ADR-0004). Stages 2–4 are planned.

## Answers now (T-021, 29 Sep 2026)

`askManual` no longer depends on vector search. It reads, with the asker's own session (so RLS decides), every manual section and every document of the chata, including text read from uploaded files (`documents.extracted_text`, written by `readDocumentText`: Word and text files directly, PDFs and photos through the AI gateway, switch `ai_documents`, 40 files per person per day). A chata's manual and papers usually fit in one prompt; when they don't, the best keyword matches go first (`src/lib/manual-answers.ts`). The model is the newest Gemini Flash the gateway lists (`/v1/models`), then `AI_CHAT_MODEL`, then fixed fallbacks, because Lovable retires model versions. Without a key or when the model fails, the best matching passage is quoted with its source. Admin-only documents never reach members' answers. Open question (ADR-0004): whether sending document files through the gateway is acceptable for personal data, and how to say so on the privacy page.

## How it works (vector index, kept for T-020)

1. An admin saves a manual section → `rebuildManualChunks` (server function) embeds each language version whose text hash changed (`gemini-embedding-001`, 768 dims, validated) and upserts one row per (section, language) into `manual_chunks`. Deleted sections' chunks are removed. Failures are counted and logged, never silent.
2. A member asks → `askManual` checks the `ai_manual` switch and a 30/day cap, embeds the question, calls `search_manual()`.
3. `search_manual()` merges vector similarity and full-text (`simple` config + `unaccent`) by reciprocal rank fusion. It runs as SECURITY INVOKER, so RLS limits it to the active account.
4. Nothing found → "no answer" instead of guessing. No AI key → the best excerpt is shown.

## Known gaps

- Embedding happens inline after save; a queue and cron worker (T-007) will retry failures.
- No test question set yet (T-008), so quality is unmeasured.
- Whether private manuals should go through Lovable's gateway or straight to Google in an EU region is an open GDPR question (ADR-0004).

## Stages to V3

| Stage | Sources                                                                       | Asked by                      |
| ----- | ----------------------------------------------------------------------------- | ----------------------------- |
| 1     | Manual sections                                                               | Members                       |
| 2     | + documents (PDF text), handover notes, closed tasks                          | Members/admins per visibility |
| 3     | Public listing profiles only, separate index; query parsed into filters first | Anyone                        |
| 4     | Stage 2 + SQL tools (bookings, expenses are queried, never embedded)          | Host copilot, guest concierge |

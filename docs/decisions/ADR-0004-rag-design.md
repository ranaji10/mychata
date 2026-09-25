# ADR-0004 House manual search: hybrid, invoker-rights, hash-based upserts

Status: accepted · Date: 2026-09-25 · Migration 0014

## Context

Stage 1 stored nothing (missing column, wrong dimensions, unchecked errors) and its retrieval function bypassed row-level security. Docs proposed OpenAI 1,536-dim embeddings, the code used Gemini.

## Decision

Keep Gemini `gemini-embedding-001` at 768 dims (good Czech, matches the column). One chunk per section and language, upserted by content hash with `model_version`. Retrieval via `search_manual()`: vector + full-text fused by reciprocal rank, SECURITY INVOKER. Structured data (bookings, expenses) is queried, never embedded.

## Open question

Private manual text passes through Lovable's AI gateway. Whether that is acceptable, or calls should go directly to Google in an EU region under a data-processing agreement, is a GDPR decision for the operator. Until decided, no new data sources (stage 2) are added.

## Consequences

Re-embedding only changed text keeps cost low. Changing model or dimensions needs a migration and a full re-embed (filter on `model_version`).

# T-007 Embedding queue and worker

Status: on hold (25 Oct 2026, ADR-0012: manual answers no longer read embeddings; build only together with T-020 when cottages outgrow 150,000 characters)
Goal: saving a manual section enqueues a job (`embedding_jobs`, trigger on `manual_sections`); a cron route (`authenticateCronRequest` exists in `src/integrations/supabase/cron-auth.ts`) embeds pending jobs with retries and backoff; `rebuildManualChunks` stays as the manual fallback.
Acceptance: 100 sections on staging embedded; re-saving unchanged text makes 0 AI calls; a forced failure is retried and then reported.

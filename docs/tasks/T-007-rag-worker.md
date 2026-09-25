# T-007 Embedding queue and worker

Status: todo
Goal: saving a manual section enqueues a job (`embedding_jobs`, trigger on `manual_sections`); a cron route (`authenticateCronRequest` exists in `src/integrations/supabase/cron-auth.ts`) embeds pending jobs with retries and backoff; `rebuildManualChunks` stays as the manual fallback.
Acceptance: 100 sections on staging embedded; re-saving unchanged text makes 0 AI calls; a forced failure is retried and then reported.

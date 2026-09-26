# T-014 Client performance and resilience (from B-005)

Status: todo · Files allowed: src/lib/account.tsx, src/router.tsx, src/lib/manual-qa.functions.ts, src/lib/task-translation.functions.ts, src/routes/fotky.tsx, src/routes/manual.tsx
Goal: fewer redundant requests, no hung server functions.

1. Call `claim_initial_membership` once per sign-in (auth state change), not inside the `identity-members` query.
2. QueryClient defaults: `staleTime` 60 s; keep retries with backoff; decide `refetchOnWindowFocus` per query (calendar yes, static data no).
3. `AbortSignal.timeout(8000)` on every AI gateway call; on timeout fall back to keyword search / original text.
4. Photo gallery: one `createSignedUrls` call instead of one per photo.
5. `manual.tsx`: show a retryable message when `askManual` throws.
   Acceptance: `bun run check`; a HAR of 10 minutes of normal use shows `claim_initial_membership` once.

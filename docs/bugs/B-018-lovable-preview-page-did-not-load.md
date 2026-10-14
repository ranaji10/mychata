# B-018 Lovable's editor preview shows "This page didn't load"; mychata.cz works

Reported: 2026-10-13 by maintainer (screenshot of the Lovable editor on `/auth`) · Status: fixed on branch `agent/claude/T-026-preview-and-defects`
Where: Lovable editor → Preview, every page, every browser. The published site is not affected.
Screenshot: in the 13 Oct conversation (Lovable overlay "The app encountered an error" with "Show logs" and "Fix error")
Steps to reproduce: run the development server with only what is in git (`vite dev`, no `.env`) and open `/auth`.
Expected / actual: expected the sign-in page. Actual: the app's own error page ("This page didn't load"); console `[Supabase] Missing Supabase environment variable(s): SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY`.
Test that reproduces it: `src/lib/env-files.test.ts` (both env files must carry the same public values). Reproduced in a browser on 13 Oct against a local `vite dev`: error page before, sign-in page after.

Cause: the browser gets the Supabase address and publishable key at build time from `VITE_*` values. Since B-002 they live in `.env.production`, which Vite reads for builds (mychata.cz) but **not** for the development server, which is what Lovable's preview runs. The preview kept working while Lovable's workspace still had an old `.env` on disk; it most likely lost it when the workspace was rebuilt from GitHub on the switch to `lovable-sync` (12 Oct), the same mechanism as B-002.

Fix: `.env.development` with the same public values (allowed in `.gitignore`), and a test that the two files stay identical and hold no secret.

About Lovable's "Fix error" button: it hands the error to Lovable's AI, which edits code and commits to `lovable-sync`. It does not publish, and `main` still needs a reviewed PR, but for this error its likely edits (the generated Supabase client, a re-added `.env`) are the kind that caused B-002. Use "Show logs" (read-only) instead, and don't publish anything Lovable changed without the usual PR review.

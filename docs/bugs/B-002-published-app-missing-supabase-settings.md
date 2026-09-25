# B-002 Published app shows "This page didn't load"

Reported: 2026-09-25 evening · Status: fixed on branch `agent/claude/fix-build-env`, needs merge + publish

Where: mychata.cz, every page, every browser, after the Lovable publish of `4f08864` (~17:52 CEST).
Console: `[Supabase] Missing Supabase environment variable(s): SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY`.

Cause: the browser bundle gets the Supabase URL and publishable key at build time from `VITE_*` variables. Until 03:20 that morning they came from a committed `.env`. Lovable removed it from git ("hygiene"), which kept working only while Lovable's workspace still had the file on disk. Switching Lovable to `lovable/experiments` and back to `main` rebuilt its workspace from GitHub, where the file no longer existed, so the next publish compiled the bundle without the values. Server-side rendering still worked (it reads runtime secrets), which is why the page looked fine to a plain HTTP check.

Fix: `.env.production` is committed with the public values only (URL, publishable key, project id, GA id). They ship in every page anyway and are protected by row-level security, not secrecy. CI now fails if the built browser bundle lacks the Supabase URL.

Lesson: an HTTP 200 on the home page is not a release check. The release runbook now opens the site in a real browser and looks at the console.

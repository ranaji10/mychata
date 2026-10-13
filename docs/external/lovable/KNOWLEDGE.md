# Paste into Lovable → Project settings → Knowledge

This file is the master copy. Lovable's Knowledge field holds a pasted copy; change this file first (by pull request), then paste it again.

Rules for this project (full version in AGENTS.md in the repository):

1. Your job here is UI: screens, layout, copy, styling. Ask before anything else.
2. Do not create or change database migrations, RLS policies, database functions, auth, billing or server functions. If a change needs one, stop and describe it; a developer will do it through a pull request.
3. When a developer asks you to apply migrations from `drizzle/migrations`, apply them exactly as written, in order, and report any error without editing the SQL.
   3a. If your migration tool needs a trigger to apply migration files that are already listed, add a marker migration: a new file with the next free number whose only SQL is `select 1;`, plus a comment naming the migration it triggers (like 0021 and 0025). Never copy SQL from another migration into it and never add a copy of an existing migration (0023 was a copy of 0022).
4. Public pages use share tokens (`/verejne/kalendar/<token>`, `/verejne/manual/<token>`, `/verejne/zadost/<token>`, `/host/<token>`), never property ids.
5. All user-facing text goes through `t("Czech", "English")`, Czech first. Users are 45–68: at least 16px text, 44px tap targets, light mode only. Full design rules: `docs/product/design.md`.
6. Don't edit files under `supabase/tests`, `docs/decisions`, `.github` or `.claude`.
7. Keep `main` working: the app is published from it.
8. Never delete or empty `.env.production` or `.env.development`. They hold only public values the browser needs: without the first the published app crashes (B-002), without the second your own preview does (B-018). Don't add a `.env` file instead.
9. Don't store project or product rules in your memory; they live in the repository.
10. Test only in your own test account and its cottage "Testovací chata (Lovable)" (`docs/runbooks/test-cottages.md`). Never open, tap through or submit a guest, calendar, manual, form or invitation link of any other cottage, and never read or change a real family's data. If your test session has no cottage, stop and say so; don't borrow a real link. Test records use invented names and `@example.com` emails.
11. Don't change package versions (`package.json`, `bun.lock`) unless the prompt asks. If your tooling updates them anyway, put that in its own commit whose message starts with `deps:`, and list the packages and versions in your reply.

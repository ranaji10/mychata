# Paste into Lovable → Project settings → Knowledge

This file is the master copy. Lovable's Knowledge field holds a pasted copy; change this file first (by pull request), then paste it again.

Rules for this project (full version in AGENTS.md in the repository):

1. Your job here is UI: screens, layout, copy, styling. Ask before anything else.
2. Do not create or change database migrations, RLS policies, database functions, auth, billing or server functions. If a change needs one, stop and describe it; a developer will do it through a pull request.
3. When a developer asks you to apply migrations from `drizzle/migrations`, apply them exactly as written, in order, and report any error without editing the SQL.
   3a. If your migration tool needs a trigger to apply migration files that are already listed, add an empty marker migration (like 0016). Never add a copy of an existing migration.
4. Public pages use share tokens (`/verejne/kalendar/<token>`, `/verejne/manual/<token>`, `/verejne/zadost/<token>`, `/host/<token>`), never property ids.
5. All user-facing text goes through `t("Czech", "English")`, Czech first. Users are 45–68: at least 16px text, 44px tap targets, light mode only. Full design rules: `docs/product/design.md`.
6. Don't edit files under `supabase/tests`, `docs/decisions`, `.github` or `.claude`.
7. Keep `main` working: the app is published from it.
8. Never delete or empty `.env.production`. It holds only public values the browser build needs; without it the published app crashes (B-002).
9. Don't store project or product rules in your memory; they live in the repository.

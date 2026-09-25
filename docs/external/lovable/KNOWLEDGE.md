# Paste into Lovable → Project settings → Knowledge

Rules for this project (full version in AGENTS.md in the repository):

1. Your job here is UI: screens, layout, copy, styling. Ask before anything else.
2. Do not create or change database migrations, RLS policies, database functions, auth, billing or server functions. If a change needs one, stop and describe it; a developer will do it through a pull request.
3. When a developer asks you to apply migrations from `drizzle/migrations`, apply them exactly as written, in order, and report any error without editing the SQL.
4. Public pages use share tokens (`/verejne/kalendar/<token>`, `/verejne/manual/<token>`, `/verejne/zadost/<token>`, `/host/<token>`), never property ids.
5. All user-facing text goes through `t("Czech", "English")`, Czech first. Users are 45–68: large tap targets, plain words.
6. Don't edit files under `supabase/tests`, `docs/decisions`, `.github` or `.claude`.
7. Keep `main` working: the app is published from it.

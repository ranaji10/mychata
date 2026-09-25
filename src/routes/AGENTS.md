# Routes (read with the root AGENTS.md; conventions in README.md here)

- Czech URL names (`/domu`, `/kalendar`, `/ukoly`, `/vydaje`, `/clenove`). Signed-in pages wrap content in `AppShell`, which redirects to `/auth` and `/onboarding`.
- Public pages (`/verejne/*/$token`, `/host/$token`, `/pozvanka/$token`) take a token, never a property id, and call only `public_*` / `submit_*` functions. Add `noindex` and `sitemap: false`.
- Role checks in the UI are cosmetic; the database decides. Show the reason when the database refuses.
- After adding or renaming a route: `bun run build` (regenerates `routeTree.gen.ts`) and `bun run docs:gen`.

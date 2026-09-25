# T-002 Move to own hosting (Model B, ADR-0007)

Status: todo, after T-003 and T-004

Goal: production deployed from GitHub Actions on `main` to your own Cloudflare account, on a Supabase project you own.
Needs from you: Cloudflare account, Supabase account (paid tier for backups), Google Cloud OAuth client, AI key (Google AI or Vertex EU), DNS access for mychata.cz.
Steps: export data (`pg_dump` + storage files) from the Lovable-managed project → restore into the new project → configure Google sign-in in Supabase → replace `@lovable.dev/cloud-auth-js` with `supabase.auth.signInWithOAuth` → deploy job in CI with `wrangler deploy` → switch DNS → keep Lovable connected on a branch for UI work.
Acceptance: e2e suite green against the new production; old project kept read-only for 30 days.

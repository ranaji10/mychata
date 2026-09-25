# Environments, hosting and local development

## Today (Model A, ADR-0007)

| Piece                   | Where                                                             | Who controls it                     |
| ----------------------- | ----------------------------------------------------------------- | ----------------------------------- |
| Hosting, build, publish | Lovable Cloud (Cloudflare)                                        | Lovable "Publish" button            |
| Database, auth, storage | Supabase project `envsfjjefkievkwqbrby`, managed by Lovable Cloud | Lovable; admin key not held locally |
| Google sign-in          | `@lovable.dev/cloud-auth-js` broker                               | Lovable                             |
| AI                      | Lovable AI gateway, `LOVABLE_API_KEY`                             | Lovable                             |
| Code                    | GitHub `ranaji10/mychata`, two-way sync with Lovable on `main`    | You                                 |

There is one database. Lovable's preview and production appear to share it, so every applied migration hits real data. Staging: T-003. Own hosting: T-002.

## Environment variables

| Name                                                        | Used by                                        | Secret?                                               |
| ----------------------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------- |
| `VITE_SUPABASE_URL`, `SUPABASE_URL`                         | Browser, server                                | No                                                    |
| `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PUBLISHABLE_KEY` | Browser, server                                | No (ships to browsers); starts with `sb_publishable_` |
| `SUPABASE_SERVICE_ROLE_KEY`                                 | Server admin client (unused by app code today) | **Yes**                                               |
| `LOVABLE_API_KEY`                                           | AI features                                    | **Yes**                                               |
| `VITE_LOVABLE_CONNECTOR_GOOGLE_ANALYTICS_API_KEY`           | GA4 measurement id                             | No                                                    |

## Where the values live

- Public browser values (`VITE_*`): committed in `.env.production`, read by Vite at build time. Never secrets.
- Secrets (`SUPABASE_SERVICE_ROLE_KEY`, `LOVABLE_API_KEY`): Lovable Cloud's secret store only.
- Local overrides: `.env.local`, never committed.

## Local development

See `../runbooks/local-dev.md`. Short version: `.env.local` with the publishable values, rewrite the registry URLs in `bun.lock` (below), `bun install`, `bun run dev`.

## The lockfile quirk

Lovable writes URLs of its private package cache (`*-npm.pkg.dev/lovable-core-prod/...`) into `bun.lock`. Outside Lovable those return 403. The same tarballs with the same integrity hashes are on the public registry, so CI rewrites the URLs before installing:

```
sed -i -E 's#https://[a-z0-9-]+-npm\.pkg\.dev/lovable-core-prod/[a-z-]+/#https://registry.npmjs.org/#g' bun.lock
```

Don't commit the rewritten lockfile; Lovable would rewrite it back.

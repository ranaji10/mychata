# Local development (macOS)

1. Clone or use the existing copy of `ranaji10/mychata`.
2. `.env.local` in the repo folder with the values from `docs/architecture/environments.md`. The publishable key starts with `sb_publishable_` (a copy with `ssb_` was found on 25 Sep 2026 and broke sign-in).
3. Point the lockfile at the public registry for this install only:
   `sed -i '' -E 's#https://[a-z0-9-]+-npm\.pkg\.dev/lovable-core-prod/[a-z-]+/#https://registry.npmjs.org/#g' bun.lock`
4. `bun install`, then `git checkout bun.lock` to undo step 3.
5. `bun run dev` → http://localhost:8080 (or the port Vite prints).
6. Before a PR: `bun run check`.

Use Bun only; a `package-lock.json` means someone ran npm, delete it.

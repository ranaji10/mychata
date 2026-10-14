# T-030 Own logo, tab icon and link-preview image from one source

Owner: Claude · Status: review

Goal: replace Lovable's heart favicon and Lovable's screenshot link-preview image with MyChata's own logo, generated from the source images in `brand/` by one command: a transparent mark, a simplified icon for tab sizes, and the full logo.
Non-goals: no change to the in-app header mark, no migrations, server functions or runtime dependencies. Lovable's hosting settings (visitor analytics, badge, social image) are changed by a maintainer, not in code.
Files allowed: `brand/*`, `scripts/brand-assets.ts`, `package.json` (script entry only), `.gitignore`, `public/favicon.ico`, `public/brand/*`, `public/og-image.jpg` (removed), `public/manifest.webmanifest`, `src/lib/brand-assets.ts`, `src/lib/brand-assets.test.ts`, `src/routes/__root.tsx` (head links and meta only), `AGENTS.md`, `docs/external/lovable/KNOWLEDGE.md`, `docs/STATUS.md`, `docs/external/claude/2026-09-25-critical-review.md` (copy of the Claude doc), this brief.
Invariants touched (AGENTS.md): none.
Context: `brand/README.md`, `docs/external/claude/2026-10-14-site-check-2.md` (og:image from Lovable's storage).

Acceptance (runnable):

- `bun run brand` regenerates every output from `brand/logo-mark.png`, `brand/logo-icon.png` and `brand/logo.jpeg` without a `package.json` dependency change
- Icons are transparent except the iPhone icon (cream, since iOS shows transparency as black); the tab icon uses the simplified cabin so it reads at 16–32 px
- `bun run check` passes, including `src/lib/brand-assets.test.ts` (every referenced file exists, one version, manifest matches, no Lovable image URL in the root head)
- Page weight: the browser fetches only `icon-32.png` (about 2 KB) and `favicon.ico` (about 6 KB) for the tab; the 512 px icon and the preview image are not loaded by pages

Handoff note: after publish, check that the tab icon shows on mychata.cz and that the page source has one `og:image` (ours). If Lovable still adds its own `og:image`, its project chat must be asked to use `https://mychata.cz/brand/og-image.jpg` (prompt 18). Not verified: how WhatsApp and Facebook render the new preview (they cache old previews for days).

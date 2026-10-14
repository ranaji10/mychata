# T-034 Site check 4 findings: banner edge, phone-sized photo, request-link heading

Owner: Claude · Status: review

Goal: fix the code findings of `docs/external/claude/2026-10-14-site-check-4.md`.
Non-goals: how much of the screen the cookie banner covers on phones (deferred by decision on 14 Oct; this only removes the 12.75px gap), no migrations, no packages.
Files allowed: `src/lib/consent.tsx`, `src/styles.css` (consent rule only), `src/lib/season.ts`, `src/assets/seasons/*-800.webp` (new), `src/routes/auth.tsx`, `src/routes/index.tsx`, `src/routes/domu.tsx`, `src/routes/verejne.zadost.$token.tsx` (hero `img` and invalid-link heading), `docs/STATUS.md`, `docs/external/claude/README.md`, this brief.
Invariants touched (AGENTS.md): 5.
Context: site check 4 ("Checks asked for", "Smaller findings").

Acceptance (runnable):

- `bun run check` passes (CI)
- 375px, signed out, banner shown: the card's bottom edge = viewport bottom, top corners round only; inside AppShell it still floats above the tab bar with all corners round; at ≥768px unchanged (floating card)
- `/auth` at 375px loads `chata-<season>-800-*.webp` (about 180 KB, was 380 KB); at 1280px the 1200px file
- `/verejne/zadost/<invalid>` has an `h1` "Tento odkaz na formulář neplatí."

Handoff note: "hero photo downloaded twice" was not reproduced. Playwright 1.56 (Chromium, 375×812) on `/`, `/auth` and `/verejne/zadost/x` at live c099891 saw one network request for the webp per load and one resource-timing entry each (15 Oct, 00:00 UTC). The preload link and the `img` already match (same URL, no `crossorigin`). Likely a measurement artefact of the earlier run; recheck once in the next site check. With `srcSet` React's automatic preload carries `imageSrcSet`/`imageSizes`, so preload and `img` still pick the same file.

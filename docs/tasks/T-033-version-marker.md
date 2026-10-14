# T-033 Version marker and two public-page fixes from site check 3

Owner: Claude · Status: review

Goal: the live site says which commit it runs, without relying on Lovable; plus the two code findings of `docs/external/claude/2026-10-14-site-check-3.md`.
Non-goals: the cookie banner (deferred by decision on 14 Oct), the hero photo size (T-014), no migrations, no packages, no new Vite plugins.
Files allowed: `vite.config.ts` (`vite.define` only), `src/build-info.d.ts`, `src/lib/build-info.ts`, `src/routes/__root.tsx` (head meta only), `src/routes/host.$token.tsx` (loading state), `src/routes/verejne.zadost.$token.tsx` (hero name line), `docs/runbooks/release.md`, `docs/STATUS.md`, this brief.
Invariants touched (AGENTS.md): 5.
Context: site check 3 ("Live commit", "Performance", "Smaller findings").

Acceptance (runnable):

- `bun run check` passes; `bun run build` output contains the current `git rev-parse HEAD` in the SSR bundle and no literal `__BUILD_SHA__`
- After publish: the page source of `/auth` has `<meta name="build-sha" content="…">` and `<meta name="build-time" content="…">`
- `/host/<invalid>`: loading and "not valid" screens share one centred frame (no layout shift); `/verejne/zadost/<invalid>`: no "Firemní chata" heading

Handoff note: whether Lovable's build host has git history (or a commit variable) is unknown until the first publish; if `build-sha` reads `unknown`, `build-time` still pins the publish, and release.md says how to match it.

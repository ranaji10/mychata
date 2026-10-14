# T-028 Fresh air: public pages, onboarding and the full blue check

Owner: Lovable · Status: todo

Goal: restyle signed-out and public pages into the "Fresh air" design, verify every page state and language switch, set Czech link previews, and perform the comprehensive brand check across the app.
Non-goals: no migrations, no RLS policies, no database functions, no server functions (`src/lib/*.functions.ts`), no package changes, no edits to shared components (`src/components/ui/*`, `ConfirmDialog.tsx`, `AppShell.tsx`, `calendar.tsx`, `bits.tsx`, `src/lib/consent.tsx`, `src/styles.css`).
Files allowed:

- `src/routes/index.tsx` (landing page)
- `src/routes/auth.tsx` (sign-in, registration, sub-screens)
- `src/routes/reset-password.tsx`
- `src/routes/onboarding.tsx`
- `src/routes/pozvanka.$token.tsx` (invitation page)
- `src/routes/verejne.kalendar.$token.tsx` (public calendar)
- `src/routes/verejne.manual.$token.tsx` (public house manual)
- `src/routes/verejne.zadost.$token.tsx` (public institution request form)
- `src/routes/host.$token.tsx` (guest booking page)
- `src/routes/__root.tsx` (NotFoundComponent and ErrorComponent only)
- `src/lib/error-page.ts` (plain-HTML fallback page)
- `roadmap.md`
- `docs/external/lovable/YYYY-MM-DD-l5c-public-pages.md` (report file)
  Note: shared components are strictly off limits. If a page seems to need a shared change, stop and record it in the report instead.
  Invariants touched (AGENTS.md): 5 (Czech-first bilingual strings through `t()`; Czech link previews in `head()`), 8 (test only in "Testovací chata (Lovable)").
  Context:
- `docs/product/design.md` (sections 1, 2, 4)
- `prompts/2026-10-14/16-L-5c-public-pages-and-blue-check.md`
- `docs/external/claude/2026-10-14-pr25-review.md`
- `docs/external/claude/2026-10-14-site-check.md`
  Acceptance (runnable):
- `bun run lint` passes (0 errors)
- `bun run format:check` passes
- `bun run test` passes (all existing tests)
- `bun run docs:check` passes
- `grep -rn "chata.jpg\|asset.json\|__l5e" src` returns empty
- Every route in the allowlist displays properly in 375px, 768px, and 1280px widths
- Text contrast ≥ 4.5:1 on landing, sign-in, onboarding, public calendar in both brands
- Cookie banner sits at the bottom edge on landing, `/auth`, `/pozvanka`, and public pages
- Czech link previews (og:title, og:description, title, description) on all public routes
- Report written to `docs/external/lovable/YYYY-MM-DD-l5c-public-pages.md` with standard header

## Scope and instructions

1. **Signed-out and public pages into "Fresh air" design:**
   - Gradient background, 640–720px wide from `md`, forms 480–560px.
   - `index.tsx`: logo + wordmark, CZ/EN switch, seasonal hero (radius 28), hero headline, pill actions. Same content.
   - `auth.tsx`: all sub-screens (e-mail sign-in, e-mail sign-up, institution sign-up, errors).
   - `reset-password.tsx`, `onboarding.tsx` (all steps), `pozvanka.$token.tsx`.
   - `verejne.kalendar.$token.tsx`, `verejne.manual.$token.tsx`, `verejne.zadost.$token.tsx` (always blue), `host.$token.tsx`.
   - **Every state of each page:** loading, invalid token/link, errors, success. Every state must have the CZ/EN toggle (fix `/host` invalid link state which lacks one today).
   - **Hero image:** on landing and `/auth`, add explicit width and height, `fetchpriority="high"`, remove `loading="lazy"`.
   - **404 and root error component in `__root.tsx`:** replace English-only text with bilingual text through `t()`, logo mark, plain sentences, primary pill button home.
   - **`src/lib/error-page.ts`:** copy family-brand tokens from `design.md` section 2 into its `<style>` block, set `lang="cs"`, Czech text first with English below, no web font.

2. **Czech link previews:**
   - In `head()` functions across all allowed routes, replace English titles and descriptions with Czech equivalents (`title`, `description`, `og:title`, `og:description`). Keep `robots: noindex` where present.

3. **Brand check across the whole app:**
   - Follow `design.md` section 1:
     - `/onboarding`: choosing "Instituce/Organizace" immediately switches to blue; family to green.
     - `/auth`: institution sign-up is blue; main choice screen is green.
     - Public pages of an institutional property are blue; family property green.
     - Sign-out from blue account lands on green `/auth`.
     - No flash of green before turning blue on full reload of signed-in institutional page.
     - If institutional account available: inspect `schvalovani.tsx`, `zadosti.tsx`, `export.tsx` with data; report findings without editing those files.

4. **Seasonal photo check:**
   - Confirm `useDefaultChataPhoto()` is used for stock photos in all public pages.
   - Verify `grep -rn "chata.jpg\|asset.json\|__l5e" src` returns no matches.

Handoff note: to be completed by Lovable upon delivery.

---
source: lovable
date: 2026-10-14
status: reviewed
task: T-026
---

# Fresh air foundation review

Preview only; no publishing. Check only `Testovací chata (Lovable)`.

## Commit list

Saved workspace commits observed for this batch, oldest first (all messages `Changes`): `12627b5`, `fb49d44`, `9c10015`, `f1f0a70`, `5be8a32`, `143e58b`, `b177ecf`. Lovable manages subsequent documentation commits automatically; these hashes do not establish remote PR/CI status.

## Changed files

- `docs/product/design.md`: exact supplied design text.
- `src/styles.css`: both palettes, font, radii, utilities, semantic shadows/toast styles.
- `src/routes/__root.tsx`: font link; remove root image metadata.
- `public/manifest.webmanifest`: green browser theme and fresh background.
- `src/lib/brand.ts`: brand propagation to HTML and portals.
- `src/lib/season.ts`, `src/lib/season.test.ts`: Prague seasonal photo hook and nine tests.
- `src/assets/seasons/chata-{spring,summer,autumn,winter}.webp.asset.json`: supplied photos via asset pointers; old `src/assets/chata.jpg` deleted.
- `src/lib/data.ts`, `src/lib/data.test.ts`: branch palette and regression test.
- `src/lib/i18n.tsx`: segmented language control.
- `src/components/AppShell.tsx`: header, greeting/avatar, sidebar, bottom tabs, sheet and banners.
- `src/components/bits.tsx`: headers, stat tiles, empty/loading states, pills and avatars.
- `src/components/calendar.tsx`: month header, continuous date bands and legend.
- `src/components/ui/button.tsx`: unstyled `fresh` variants let existing semantic utilities use the shared Button without changing legacy variants.
- `src/routes/auth.tsx`: sign-in composition, institution brand, seasonal hero; existing sign-in logic preserved.
- `src/routes/domu.tsx`: status headline, photo, tiles and list layouts.
- `src/routes/kalendar.tsx`: title/action, month/list control and stay rows.
- `src/routes/index.tsx`: seasonal image/background only.
- `src/routes/onboarding.tsx`: brand/background only.
- `src/routes/verejne.zadost.$token.tsx`: brand/background and seasonal image only.
- `src/routes/verejne.kalendar.$token.tsx`, `src/routes/verejne.manual.$token.tsx`: brand/background only.
- `AGENTS.md`: shared UI module boundary rule.
- `roadmap.md`, `docs/STATUS.md`, this file: scope, results and blockers.

## Click-through checks at 375px and 1280px

1. Signed out: `/auth` shows autumn, white house mark, CZ/EN and pill actions. Register institution: blue; focus organisation input: blue outline; Back: green. Cookie settings also adopt blue.
2. Home in the test cottage: greeting, status, autumn fallback, Add booking, stay actions, tiles, task/departure lists. Tap cottage title: sheet lists one account and its test cottage. No overflow.
3. Calendar: month title/navigation, confirmed/pending legend and stay rows. List hides the month. Add stay restores the month and date picking.
4. Photos: upload test summer photo, select its star, return Home: summer overrides autumn. Delete that temporary photo through confirmation, return Home: autumn restored. Completed and cleaned up.

No other cottage links opened; no browser page errors in the reference-screen checks.

## Screenshots

Captured and visually reviewed at both requested widths; sandbox evidence:

- `/tmp/browser/fresh-air/auth-375.png`, `auth-1280.png`
- `/tmp/browser/fresh-air/home-375.png`, `home-1280.png`
- `/tmp/browser/fresh-air/calendar-375.png`, `calendar-1280.png`
- `/tmp/browser/fresh-air/blue-375.png`, `blue-1280.png`
- `/tmp/browser/fresh-air/blue-consent.png`, `home-main-photo.png`

## Quality gate and limitations

- Automatic preview typecheck/build: OK.
- Lint: 0 errors; 13 existing warnings.
- Tests: 103 passed (10 files); includes nine season boundaries and branch palette.
- Generated docs check: passes. No hexadecimal colours outside `ui/` in routes/components.
- `format:check`: fails only on the exact supplied `docs/product/design.md` table formatting. Reformatting would contradict the exact-copy requirement; left unchanged. Therefore the full check gate is **not green**.
- Primary text contrast: green/white 5.32:1, blue/white 6.48:1. Supplied faint calendar text/white is 2.25:1, below the requested universal 4.5:1; palette preserved rather than silently changed.
- No institutional test account, so signed-in blue and cross-account switching require maintainer verification. Host/invitation data lack an institution indicator and remain green.
- Cookie settings blue verified; Radix dialog/Sonner toast while blue not exercised. Public institutional pages were not opened. External mock-up boards were unavailable; layout checked against supplied descriptions, not pixel matching.
- No package, database, auth logic or server-function changes; no publishing. Full `bun run check` was not executed because the harness owns typechecking; constituent allowed checks and automatic signal are reported separately.

---
source: claude
model: Claude Code site-check subagent
date: 2026-10-17
status: reviewed
artifact: none (local report only, not published as a Claude artifact)
live_commit: a8b0b84
---

# Site check: mychata.cz, 17 Oct 2026

Run at about 23:10 UTC, after PR #50 (T-037) was merged and published. The last check was `2026-10-15-site-check.md`. Nothing was changed: nobody signed in, no forms were submitted and no data was touched. Only made-up tokens (`x`, `x-123456789012345`) were used.

The Chrome DevTools MCP was not available, so the check used Playwright (global 1.56.1, Chromium 141 headless, mobile context, locale cs-CZ) and curl.

## Summary

- **Live commit: `a8b0b84`** (`a8b0b84a36bf377cbfcd4abbcb9ec926aaac67e9`, merge of PR #50). It comes from `<meta name="build-sha">` on `/auth`, and a separate curl read gave the same value. `build-time` is `2026-10-17T22:54:11.642Z`, 50 s after the merge (22:53:21Z). This is the current head of `main`.
- All 6 e2e smoke tests pass. None of the 5 pages has console errors, warnings, page errors or failed first-party requests.
- Every requested check passes. The cookie banner check passed only with a simulated EU response (see below).

## Pages

| Page                      | Status | Errors | Notes                                                                                                                                                          |
| ------------------------- | ------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                       | 200    | none   | Sends signed-out visitors to `/auth`. Server title "My Chata — správa sdílené chaty", then "Přihlášení — My Chata". Cold load: TTFB 927 ms, LCP 3244 ms, CLS 0 |
| `/auth`                   | 200    | none   | "Pokračovat přes Google", "Registrovat se e-mailem", "Registrovat instituci", "Už máte účet? Přihlásit se"; title "Přihlášení — My Chata"; LCP 376 ms, CLS 0   |
| `/verejne/kalendar/x`     | 200    | none   | "Tento odkaz na kalendář neplatí. Požádejte správce chaty o aktuální odkaz."; title "Kalendář chaty — My Chata"; LCP 3400 ms, CLS 0                            |
| `/verejne/zadost/x`       | 200    | none   | "Tento odkaz na formulář neplatí." / "Požádejte správce chaty o aktuální odkaz."; title "Žádost o pobyt — My Chata"; LCP 1620 ms, CLS 0                        |
| `/host/x-123456789012345` | 200    | none   | "Tento odkaz už neplatí." / "Požádejte správce chaty o aktuální odkaz."; title "Pobyt pro hosty — My Chata"; LCP 504 ms, CLS 0.0043                            |

"Errors" means console errors, page errors and first-party 4xx/5xx responses. The only failed requests were Google Analytics `g/collect` beacons (`net::ERR_ABORTED`: 3 on `/`, 1 on each other page). This check ignores them.

## Checks asked for

| Check                                                 | Result            | Evidence                                                                                                                                                                                                                                                                                                                   |
| ----------------------------------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Three "link not valid" pages, no console errors       | Pass              | See the Pages table. The console, page-error and 4xx/5xx lists were empty, and e2e tests 3–5 passed.                                                                                                                                                                                                                       |
| Supabase URL in bundle (B-002)                        | Pass              | `/assets/index-DKFvAQhJ.js` (616 KB decoded, 179 KB transferred) contains the project's `supabase.co` URL 3 times.                                                                                                                                                                                                         |
| `/auth` three options plus "Already have an account?" | Pass (Czech only) | Texts as in the Pages table. The English texts were not checked, because switching language needs a click.                                                                                                                                                                                                                 |
| Live commit                                           | Pass              | `build-sha` `a8b0b84a36bf377cbfcd4abbcb9ec926aaac67e9`, `build-time` `2026-10-17T22:54:11.642Z`.                                                                                                                                                                                                                           |
| Tab icon and one `og:image`                           | Pass              | `<link rel="icon" href="/brand/icon-32.png?v=edd2dd6f" type="image/png" sizes="32x32">` returns 200 `image/png`. `/favicon.ico?v=edd2dd6f` and `/brand/apple-touch-icon.png?v=edd2dd6f` both return 200. There is exactly one `og:image`: `https://mychata.cz/brand/og-image.jpg?v=edd2dd6f` (200 `image/jpeg`, 1200×630). |
| Seasonal photo from `/assets/`                        | Pass              | `/auth` loads `https://mychata.cz/assets/chata-autumn-800-Nwv4xG_M.webp` (200 `image/webp`, about 177 KB). There were no `/__l5e/` and no Lovable storage requests.                                                                                                                                                        |
| Cookie banner at 375px                                | Pass (simulated)  | No banner appears from this US runner (the consent check returns `country: "US", required: false`). With that response rewritten to `CZ` / `required: true` in the test browser, fresh context: at 375×812 the box is x 0, width 375, top 476.5, bottom 812 (= innerHeight). At 375×667 the bottom is 667 (= innerHeight). |
| Page titles Czech                                     | Pass              | "Přihlášení — My Chata", "Kalendář chaty — My Chata", "Žádost o pobyt — My Chata", "Pobyt pro hosty — My Chata". The raw `/` title is "My Chata — správa sdílené chaty".                                                                                                                                                   |

## Other observations

- The analytics page_view for `/auth` is sent with the old title "My Chata — správa sdílené chaty", so it fires before the route title is set. Small, but GA page reports will show the wrong title for `/auth`.
- LCP on a cold `/` (3.2 s, with the redirect) and on `/verejne/kalendar/x` (3.4 s, where the message appears after a data call) is still slow. These are single lab runs through a proxy, not field data.
- INP stand-in: tapping a heading gave a slowest event of 24–32 ms. This is not a real INP measurement.

## E2E output

`E2E_BASE_URL=https://mychata.cz bun run e2e` does not run as-is in this copy, because `node_modules` is not installed (`Cannot find package '@playwright/test'`). The config and `tests/e2e/` were copied to a scratch folder, with `@playwright/test` resolved to the global playwright 1.56.1:

```
Running 6 tests using 1 worker

  ✓  1 tests/e2e/public.spec.ts:5:1 › home page loads and shows sign-in (5.0s)
  ✓  2 tests/e2e/public.spec.ts:10:1 › sign-in page offers Google and email (1.8s)
  ✓  3 tests/e2e/public.spec.ts:15:1 › an unknown share token shows no calendar data (1.8s)
  ✓  4 tests/e2e/public.spec.ts:23:1 › an invalid institution form link says so (1.5s)
  ✓  5 tests/e2e/public.spec.ts:28:1 › an invalid guest link says so (1.3s)
  ✓  6 tests/e2e/public.spec.ts:34:1 › sign-in page runs in the browser without console errors (1.5s)

  6 passed (14.9s)
```

## Not verified

- Anything that needs the Chrome DevTools MCP, such as a performance trace or field INP.
- The cookie banner as a real EU visitor sees it. The runner is in the US, and the CZ response was simulated.
- The English texts on `/auth`.
- Real-device rendering (safe-area padding, browser bars).
- Why the GA beacons are aborted. The outbound proxy probably blocks them, but this was not confirmed.
- Anything that needs a signed-in user.

Source file: docs/external/claude/2026-10-17-site-check.md

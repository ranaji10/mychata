---
source: claude
model: Claude Code site-check subagent
date: 2026-10-15
status: reviewed
artifact: none (local report only, not published as a Claude artifact)
live_commit: 37b2a0e
---

# Site check: mychata.cz, 15 Oct 2026

Run at about 00:23 UTC (server `Date` header), right after PR #43 was merged and published. Yesterday's last check is `2026-10-14-site-check-4.md`. The check was read-only: nobody signed in, no forms were submitted, no buttons were clicked and no data was changed. Only made-up tokens (`x`, `x-123456789012345`) were used.

The Chrome DevTools MCP was not available, so the check used Playwright (global 1.56.1, Chromium 141 headless) and curl, at 375×812, DPR 2, mobile/touch.

## Summary

- **Live commit: `37b2a0e`** (`37b2a0eba0e9b3806ae242f76eb6b4fda336c01f`, merge of PR #43), read from `<meta name="build-sha">` on `/auth`. `build-time` is `2026-10-15T00:17:44.714Z`, 45 s after the merge (00:16:59Z). This is the current head of `main` and includes PR #42 (T-034).
- 6 of 6 e2e smoke tests pass. None of the 5 pages has console errors, page errors or failed first-party requests.
- All checks asked for pass. The cookie banner check passed with a simulated EU response only (see below).
- All three items left open yesterday are fixed: cookie-banner inset, hero photo downloaded twice, no heading on the invalid request link.

## Pages

| Page                      | Status | Errors | Notes                                                                                                                                                    |
| ------------------------- | ------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                       | 200    | none   | Sends signed-out visitors to `/auth`. Server title "My Chata — správa sdílené chaty", then "Přihlášení — My Chata". Cold load: TTFB 1395 ms, LCP 3876 ms |
| `/auth`                   | 200    | none   | "Pokračovat přes Google", "Registrovat se e-mailem", "Registrovat instituci", "Už máte účet? Přihlásit se"; title "Přihlášení — My Chata"; LCP 592 ms    |
| `/verejne/kalendar/x`     | 200    | none   | H1 "Kalendář chaty"; "Tento odkaz na kalendář neplatí. Požádejte správce chaty o aktuální odkaz."; title "Kalendář chaty — My Chata"; LCP 3412 ms        |
| `/verejne/zadost/x`       | 200    | none   | **H1** "Tento odkaz na formulář neplatí." / "Požádejte správce chaty o aktuální odkaz."; title "Žádost o pobyt — My Chata"; LCP 1772 ms                  |
| `/host/x-123456789012345` | 200    | none   | H1 "Tento odkaz už neplatí." / "Požádejte správce chaty o aktuální odkaz."; title "Pobyt pro hosty — My Chata"; LCP 644 ms, CLS 0.0043                   |

"Errors" covers console errors, page errors and first-party 4xx/5xx responses. The only failed requests were Google Analytics `g/collect` beacons (`net::ERR_ABORTED`: 2 on `/`, 1 on each other page), which this check ignores. All `_serverFn` calls returned 200. CLS was 0 on every page except `/host/x-…`.

## Checks asked for

| Check                                                 | Result            | Evidence                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------------------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Three "link not valid" pages, no console errors       | Pass              | See the Pages table. Console, page-error and 4xx/5xx lists were empty; e2e tests 3–5 passed.                                                                                                                                                                                                                                                                                      |
| Supabase URL in bundle (B-002)                        | Pass              | `/assets/index--ICT7Ou3.js` (625 KB decoded, 182 KB transferred) contains the project's `supabase.co` URL 3 times (a 4th match is a `*.supabase.co` allow-list pattern).                                                                                                                                                                                                          |
| `/auth` three options plus "Already have an account?" | Pass (Czech only) | Texts as in the Pages table. English texts not checked (switching language needs a click).                                                                                                                                                                                                                                                                                        |
| Live commit                                           | Pass              | `build-sha` `37b2a0eba0e9b3806ae242f76eb6b4fda336c01f`, `build-time` `2026-10-15T00:17:44.714Z`. Re-read independently with curl.                                                                                                                                                                                                                                                 |
| Tab icon and one `og:image`                           | Pass              | `<link rel="icon" href="/brand/icon-32.png?v=c27a47bb" type="image/png" sizes="32x32">` returns 200 `image/png`. Also `/favicon.ico?v=c27a47bb` and `/brand/apple-touch-icon.png?v=c27a47bb` (both 200). Each of the 5 pages has exactly one `og:image`: `https://mychata.cz/brand/og-image.jpg?v=c27a47bb` (200 `image/jpeg`).                                                   |
| Seasonal photo from `/assets/`                        | Pass              | The only image request on `/auth` is `https://mychata.cz/assets/chata-autumn-800-Nwv4xG_M.webp` (200, 181 KB). One resource-timing entry: the `<img>` reuses the preload (same `imageSrcSet`/`sizes`, 800w and 1200w). Nothing from `/__l5e/`, Lovable storage or r2.dev in the HTML.                                                                                             |
| Cookie banner at 375px                                | Pass (simulated)  | No banner appears from this US runner (consent function returns `country: "US", required: false`). With that one response rewritten to `CZ` / `required: true` in the test browser: wrapper `position: fixed; bottom: 0`, no padding or margin; card rect bottom 812 = viewport height, left 0, right 375, radius `28px 28px 0 0`; 3 buttons 52px tall; covers 41% of the screen. |
| Page titles Czech                                     | Pass              | Server `<title>` and title after hydration match: "Přihlášení — My Chata", "Kalendář chaty — My Chata", "Žádost o pobyt — My Chata", "Pobyt pro hosty — My Chata"; raw `/` is "My Chata — správa sdílené chaty".                                                                                                                                                                  |

## Yesterday's open items (`2026-10-14-site-check-4.md`)

- Cookie-banner card inset about 12.75px at 375px: **fixed** (flush at the bottom, only top corners rounded).
- Hero webp downloaded twice: **fixed** (one request; phones get the 800w file, 181 KB instead of 2 × 380 KB).
- No heading on the invalid request link: **fixed** (`/verejne/zadost/x` has an H1).

## Other observations

- The server HTML contains a few NUL bytes (3–7 per page) inside TanStack Router match ids in the hydration payload (for example `"__root__\x00"`). No visible effect; plain `grep` treats the HTML as binary. Probably framework internals; noted only.
- GA beacons from the US runner carry `gcs=G100` / `pscdl=denied`, although the US path is meant to allow analytics. Not investigated.
- LCP on `/` (3.9 s cold, with redirect) and `/verejne/kalendar/x` (3.4 s, message shown after a data call) is slow. These are single lab runs through a proxy, not field data.

## E2E output

`E2E_BASE_URL=https://mychata.cz bun run e2e` fails as-is in this copy because `node_modules` is not installed (`Cannot find package '@playwright/test'`). The spec and config were copied to a scratch folder with only the import changed to the global `playwright/test` (1.56.1):

```
Running 6 tests using 1 worker

  ✓  1 tests/e2e/public.spec.ts:5:5 › home page loads and shows sign-in (5.2s)
  ✓  2 tests/e2e/public.spec.ts:10:5 › sign-in page offers Google and email (2.4s)
  ✓  3 tests/e2e/public.spec.ts:15:5 › an unknown share token shows no calendar data (1.6s)
  ✓  4 tests/e2e/public.spec.ts:23:5 › an invalid institution form link says so (1.9s)
  ✓  5 tests/e2e/public.spec.ts:28:5 › an invalid guest link says so (1.8s)
  ✓  6 tests/e2e/public.spec.ts:34:5 › sign-in page runs in the browser without console errors (1.3s)

  6 passed (16.5s)
```

## Not verified

- The cookie banner as a real EU visitor sees it (the runner is in the US; the CZ response was simulated).
- English texts on `/auth`.
- A DevTools performance trace and INP; a real phone or DPR 3 device (where the 1200w hero would likely load).
- Why GA reports consent as denied on the US path.
- Anything that needs a signed-in user.

Source file: docs/external/claude/2026-10-15-site-check.md

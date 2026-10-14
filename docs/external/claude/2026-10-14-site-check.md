---
source: claude
date: 2026-10-14
status: reviewed
artifact: none (local report only, not published as a Claude artifact)
---

# Site check and release readiness: mychata.cz, 14 Oct 2026

Read-only check of the live site at about 12:09 UTC. Nobody signed in, no forms were submitted and no data was changed. The invalid links used made-up tokens, not another cottage's links.

## Summary

The public pages pass: all 6 e2e smoke tests pass, and none of the 4 pages has console errors or failed requests (only the Google Analytics beacon was aborted, which is ignored). Still open: which commit is live cannot be read from the site, and the release checks that need a signed-in maintainer were not done.

## Public pages

| Page                      | Status | Errors | Notes                                                                                                                                                                                                                                                    |
| ------------------------- | ------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/auth`                   | 200    | none   | Shows "Pokračovat přes Google", "Registrovat se e-mailem", "Už máte účet? Přihlásit se" and "Škola nebo firma? Registrovat instituci". All buttons are 47px or taller. Main content shown after 2.2 s; the largest element is the autumn photo (380 KB). |
| `/verejne/kalendar/x`     | 200    | none   | Shows "Tento odkaz na kalendář neplatí. Požádejte správce chaty o aktuální odkaz." No calendar data appears.                                                                                                                                             |
| `/verejne/zadost/x`       | 200    | none   | Shows "Tento odkaz na formulář neplatí." "Firemní chata" is the page's built-in default name, not real cottage data.                                                                                                                                     |
| `/host/x-123456789012345` | 200    | none   | Shows "Tento odkaz už neplatí." This page has no CZ/EN switch, unlike the other two.                                                                                                                                                                     |
| Bundle (B-002)            | –      | –      | Confirmed: the main `index-*.js` bundle contains `VITE_SUPABASE_URL` pointing at the project's `supabase.co` address.                                                                                                                                    |

### E2E output

The stock `E2E_BASE_URL=https://mychata.cz bun run e2e` fails before reaching the site: the repo pins `@playwright/test ^1.63`, which expects browser build 1243, while the cloud environment only has build 1194. The same spec was re-run from a temporary config that points at the installed Chromium (no repo files changed):

```
Running 6 tests using 1 worker

  ✓  1 tests/e2e/public.spec.ts:5:1 › home page loads and shows sign-in (5.3s)
  ✓  2 tests/e2e/public.spec.ts:10:1 › sign-in page offers Google and email (2.2s)
  ✓  3 tests/e2e/public.spec.ts:15:1 › an unknown share token shows no calendar data (2.1s)
  ✓  4 tests/e2e/public.spec.ts:23:1 › an invalid institution form link says so (2.3s)
  ✓  5 tests/e2e/public.spec.ts:28:1 › an invalid guest link says so (3.3s)
  ✓  6 tests/e2e/public.spec.ts:34:1 › sign-in page runs in the browser without console errors (26.1s)

  6 passed (45.0s)
```

### Biggest resources on `/auth`

| Resource              | Decoded | Transferred |
| --------------------- | ------- | ----------- |
| `index-CMWsZ6Sz.js`   | 622 KB  | 181 KB gzip |
| `chata-autumn.webp`   | 379 KB  | 380 KB      |
| `styles-DXZqhtgx.css` | 86 KB   | 16 KB       |
| `i18n-DS8JrhL6.js`    | 41 KB   | 14 KB       |

## Which commit is live

The site does not show it: there is no version tag or `/version` page, and Lovable's `x-deployment-id` header does not map to a commit. The autumn photo on the live site (asset `7c42db0c-…`) was added in `12627b5` (14 Oct, 08:33 UTC), so the live build is that commit or newer. `main` is 14 commits further on, at `aa95a82`. To know exactly: check Lovable's publish history, or have the build put the commit hash into the page (for example a `<meta name="version">`).

## Smaller findings

- Page titles and descriptions are English only ("Sign in — My Chata") on Czech pages, against the Czech-first rule.
- The `/host` invalid-link page has no language switch.
- The server took 0.8–1.6 s to start answering each page, measured through the cloud environment's proxy, so real users may see less.

## Not measured

- INP (how fast the page responds to taps) needs real clicks; none were made.
- Speed numbers come from one cold load per page, not a full browser trace (the Chrome DevTools tool was not available).
- The English text on `/auth`.

## Release checks (`docs/runbooks/release.md`)

| Item                           | State                                                              |
| ------------------------------ | ------------------------------------------------------------------ |
| CI on `main`                   | Green at `aa95a82` (PR #23, 14 Oct 09:37 UTC)                      |
| Nightly production check       | Passed on 13 and 14 Oct                                            |
| New migrations to apply        | None (database at 0025, no 0026 in the repo)                       |
| Check 0: page loads            | Pass (site check above)                                            |
| Checks 1–5                     | Not done: need the maintainer's Google sign-in                     |
| T-022 two-account checks (six) | Not done: need two signed-in accounts and a temporary test cottage |
| Release tag                    | None yet; this would be the first `release-YYYY-MM-DD` tag         |

After a maintainer runs the signed-in checks: tag the published commit as `release-2026-10-14`, then update the Production row in `docs/STATUS.md` in the next pull request (it still says "up to PR #17").

Source file: docs/external/claude/2026-10-14-site-check.md

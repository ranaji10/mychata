---
source: claude
model: Claude (cloud session, site-check subagent)
date: 2026-10-26
status: reviewed
artifact: none (local report only, not published as a Claude artifact)
live_commit: f1b1bd6
---

# Site check: mychata.cz after the PR #76 (T-046) publish, 26 Oct 2026

Run by the site-check subagent from a cloud session (US runner). The Chrome DevTools MCP was not available, so it used Playwright with the container's Chromium (`PW_CHROMIUM_PATH=/opt/pw-browsers/chromium`), mobile viewport 390×844, cs-CZ. Read-only: no successful sign-in, no account created, no form submitted except the one deliberately failing sign-in below, no data changed.

Live commit `f1b1bd6`, read from `/auth` page source: `<meta name="build-sha" content="f1b1bd65080679ea19231703a7cca4c74aadc925"/>`, `<meta name="build-time" content="2026-10-26T00:28:09.271Z"/>`. It matches the expected PR #76 build.

**Limit of this run:** the session's egress proxy refuses `envsfjjefkievkwqbrby.supabase.co` (403 on CONNECT, also from `curl`). The browser therefore got `net::ERR_TUNNEL_CONNECTION_FAILED` on every Supabase call. This is the sandbox, not the site. Because of it, the two Supabase-backed invalid-link pages were checked twice: live (they show their load-error message) and with the Supabase answer for an unknown token (`[]`) simulated in the browser (they show their "link not valid" message). No answer from the real Supabase was seen in this run.

## e2e

`E2E_BASE_URL=https://mychata.cz PW_CHROMIUM_PATH=/opt/pw-browsers/chromium bun run e2e`: 6 passed, 1 failed. The failure is "an invalid institution form link says so": the page sat on "Načítám chatu…" past the 5 s timeout because its `public_property` call could not reach Supabase from this sandbox (see above). The calendar test passed (re-run: pass in 2.3 s), but the server-rendered HTML of `/verejne/kalendar/<token>` already contains "Tento odkaz na kalendář neplatí" (verified with `curl`), so the test can match before the browser's Supabase call has finished; it is a weak signal in this run and in general (possible follow-up: wait for the `public_property` response in the test). Treat both Supabase-backed tests as not proven by this run.

## Pages

| Page                      | Status | Errors                     | Notes                                                                                                                                                                                                                                                                                          |
| ------------------------- | ------ | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                       | 200    | none                       | SSR title "My Chata — správa sdílené chaty", then the sign-in screen ("Přihlášení — My Chata")                                                                                                                                                                                                 |
| `/auth`                   | 200    | none                       | Title "Přihlášení — My Chata". LCP 1.40 s (hero webp), CLS 0, INP 80 ms (language toggle taps). No cookie banner (US runner)                                                                                                                                                                   |
| `/verejne/kalendar/x`     | 200    | none (app)                 | Title "Kalendář chaty — My Chata". Live: "Kalendář se nepodařilo načíst. Zkuste stránku obnovit." (Supabase unreachable from sandbox, no crash). Simulated unknown-token answer: "Tento odkaz na kalendář neplatí. Požádejte správce chaty o aktuální odkaz."                                  |
| `/verejne/zadost/x`       | 200    | none (app)                 | Title "Žádost o pobyt — My Chata". Live: "Chatu se nepodařilo načíst. Zkuste stránku obnovit." (same cause). Simulated: "Tento odkaz na formulář neplatí."                                                                                                                                     |
| `/host/x-123456789012345` | 200    | none                       | Title "Pobyt pro hosty — My Chata". "Tento odkaz už neplatí." (no Supabase call needed; live)                                                                                                                                                                                                  |
| `/soukromi` (signed out)  | 200    | none                       | Title "Soukromí a cookies — My Chata". Back link `aria-label="Zpět"`, 47×47 px, `href="/auth"`; clicked with no history it went to `/auth`                                                                                                                                                     |
| `/pomoc` (signed out)     | 200    | none                       | Redirected to `/auth` (sign-in)                                                                                                                                                                                                                                                                |
| `/auth`, email sign-in    | —      | one, caused by the sandbox | "Přihlásit se", `nobody@example.invalid` + fake password, Enter in the password field: `POST …supabase.co/auth/v1/token?grant_type=password` was sent. It never reached Supabase (proxy). The app showed "Nepodařilo se: Failed to fetch" and logged `[auth] password AuthRetryableFetchError` |

Ignored failed requests: `fonts.googleapis.com` and `googletagmanager.com` (blocked by the sandbox proxy), plus the Supabase calls described above. No HTTP 4xx/5xx from mychata.cz.

## Checks

| Check                                 | Result                                                                                                                                                                                                                                                      |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Three invalid public links            | `/host`: pass, live. `/verejne/kalendar`, `/verejne/zadost`: pass only with the simulated Supabase answer; live they show their load-error message because Supabase is blocked from this sandbox. No crash, no console errors from the app                  |
| B-002 Supabase URL in the bundle      | Pass: `/assets/index-BJbYcEXw.js` contains `envsfjjefkievkwqbrby.supabase.co` 4 times                                                                                                                                                                       |
| /auth options                         | Pass. Czech: "Pokračovat přes Google", "Registrovat se e-mailem", "Registrovat instituci", "Už máte účet? Přihlásit se". English (EN toggle): "Continue with Google", "Sign up with email", "Sign up as an institution", "Already have an account? Sign in" |
| build-sha / build-time                | Pass: `f1b1bd65080679ea19231703a7cca4c74aadc925`, `2026-10-26T00:28:09.271Z`                                                                                                                                                                                |
| Tab icon                              | Pass: `/brand/icon-32.png?v=edd2dd6f` (200, image/png); `/favicon.ico?v=edd2dd6f` as fallback                                                                                                                                                               |
| og:image                              | Pass: exactly one on `/` and `/auth`, `https://mychata.cz/brand/og-image.jpg?v=edd2dd6f` (200, image/jpeg, 1200×630)                                                                                                                                        |
| Seasonal photo on /auth               | Pass: `/assets/chata-autumn-800-Nwv4xG_M.webp` (srcset of `chata-autumn-DIt40PoD.webp`), downloaded once, 181 KB                                                                                                                                            |
| Czech titles (/, /auth, three public) | Pass (quoted above)                                                                                                                                                                                                                                         |
| T-046 /soukromi Back                  | Pass                                                                                                                                                                                                                                                        |
| T-046 /pomoc signed out               | Pass: redirects to `/auth`                                                                                                                                                                                                                                  |
| T-046 Enter submits email sign-in     | Pass: the token POST was sent on Enter. Supabase's reply (expected "invalid credentials") not seen, sandbox blocks it                                                                                                                                       |
| Cookie banner                         | Not shown (region): the consent server function answered `country: "US"`, not required                                                                                                                                                                      |

Biggest resources on /auth (transfer / decoded): `index-BJbYcEXw.js` 176 KB / 603 KB, hero webp 181 KB, `styles-3UNCpKY8.css` 17 KB / 90 KB, `i18n-B1jlWsWC.js` 15 KB, `createServerFn-C3uQl4F0.js` 12 KB, `auth-G3yLpVBD.js` 6 KB. Fonts and GA were blocked, so LCP may be slightly lower than for a real visitor.

Not verified: real Supabase answers on the two public token pages and on the failed sign-in (sandbox egress); `/pomoc` signed in (PR #76 follow-up); cookie banner from an EU IP; `/soukromi` Back with history (goes back).

Source file: docs/external/claude/2026-10-26-site-check.md

## Rechecked from Czechia (main session, 26 Oct, Chrome with real Supabase answers)

- `/verejne/kalendar/x`: "This calendar link is not valid. Ask the cottage's administrator for the current link." Pass.
- `/verejne/zadost/x`: "This form link is not valid." Pass.
- Signed in as Test 3 (built-in browser): Settings shows "Help & support"; `/pomoc` renders in blue for the organisation, the FAQ opens, version `f1b1bd6`. Pass.

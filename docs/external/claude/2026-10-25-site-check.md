---
source: claude
model: claude-opus-5-5 (cloud session)
date: 2026-10-25
status: reviewed
artifact: none (local report only)
live_commit: 06d9db3
---

# Site check: mychata.cz after the T-043 publish, 25 Oct 2026 (about 01:55 Czech time)

Live commit `06d9db3` ("Applied 0034 via marker file", Lovable's head of `lovable-sync`, PR #69 not yet merged), `build-time` 2026-10-24T23:48:31Z, read from `/auth`. It contains T-043 (PR #66), T-044 (PR #67) and PR #68, plus Lovable's marker 0035 for migration 0034.

## Checks

| Check                                                             | Result                                                                                                                                                                                                                                                                                                                                                          |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Security headers (F-06) on `/auth`                                | Pass: `X-Frame-Options: SAMEORIGIN`, `Content-Security-Policy: frame-ancestors 'self'; object-src 'none'; base-uri 'self'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`, `Strict-Transport-Security: max-age=31536000; includeSubDomains` |
| Public pages                                                      | 200 and Czech titles: `/soukromi` "Soukromí a cookies", `/verejne/kalendar/x` "Kalendář chaty", `/verejne/zadost/x` "Žádost o pobyt", `/host/x-…` "Pobyt pro hosty"; no page errors                                                                                                                                                                             |
| Privacy page                                                      | "Takhle vidíme statistiky my" card present                                                                                                                                                                                                                                                                                                                      |
| Tab bar (signed in as Lovable's test user, maintainer's Chrome)   | Home, Expenses, Calendar, Notifications, Settings                                                                                                                                                                                                                                                                                                               |
| Public calendar of `Testovací chata (Lovable)` (signed in, admin) | "Chcete tu pobývat?" section and "Požádat o termín"; form opens; picking 28–29 Oct and sending calls `request_public_booking` and answers "You are a member of this cottage: book the dates in the app." (correct for a member; nothing stored). "Vaše žádosti" loaded without error, so `my_public_booking_requests` exists: migration 0034 is applied         |
| Invalid institution link in a real browser                        | "This form link is not valid."                                                                                                                                                                                                                                                                                                                                  |
| e2e from the cloud container                                      | 6/7; "an invalid institution form link says so" fails because the container's proxy blocks `*.supabase.co` (`ERR_TUNNEL_CONNECTION_FAILED`), so the page shows "Chatu se nepodařilo načíst". Not a site defect (same page passes in a real browser)                                                                                                             |

## Not verified

- The full visitor trip (sign-up with a fresh e-mail → confirmation → back on the calendar → request → admin approval → "Schválil(a)"): creating accounts and typing passwords on the live site is for a maintainer (N-14).
- The cookie banner on a phone from an EU address (the maintainer's Chrome has already chosen).
- GA events arriving: the maintainer's Chrome doesn't run gtag.js; key events can be starred once `sign_up` and the others appear in GA.

Source file: `docs/external/claude/2026-10-25-site-check.md` in the mychata repo.

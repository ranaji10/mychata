---
source: claude
model: claude-opus-5-5
date: 2026-10-27
status: reviewed
artifact: none (local report only, not published as a Claude artifact)
live_commit: dc50299
---

# Site check: mychata.cz after the PR #80 + #81 publish, 27 Oct 2026

Prompt `10-after-publish-site-check.md`. Public pages with Playwright from a cloud session (US; Supabase isn't reachable from there, so data-backed pages were rechecked in the maintainer's built-in browser), signed-in pages in the built-in browser as Test 3 (already signed in). Test cottage only: `Institutní chata (test)`. Nothing submitted or changed.

Live commit: `/auth` has `<meta name="build-sha" content="dc50299ac40715d03b9737b7f8cfa11b0f019099">` (merge of PR #81, which includes #80), `build-time` 2026-10-26T21:17:43Z.

## Public pages

| Page                      | Status        | Errors                  | Notes                                                                                                                                                                                                                                                |
| ------------------------- | ------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/` signed out            | 200 → `/auth` | none                    |                                                                                                                                                                                                                                                      |
| `/auth` (1280 and 375 px) | 200           | none                    | Three options + "Už máte účet? Přihlásit se"; title "Přihlášení — My Chata"; cottage tab icon `/brand/icon-32.png?v=edd2dd6f`; one `og:image` → `https://mychata.cz/brand/og-image.jpg?v=edd2dd6f`; seasonal photo `/assets/chata-autumn-800-….webp` |
| `/verejne/kalendar/x`     | 200           | none (built-in browser) | "This calendar link is not valid. Ask the cottage's administrator for the current link."; title Czech in the HTML ("Kalendář chaty")                                                                                                                 |
| `/verejne/zadost/x`       | 200           | none (built-in browser) | "This form link is not valid."                                                                                                                                                                                                                       |
| `/host/x-123456789012345` | 200           | none                    | "Tento odkaz už neplatí. Požádejte správce chaty o aktuální odkaz."                                                                                                                                                                                  |
| `/soukromi` signed out    | 200           | none                    | Back arrow "Zpět" → `/auth` (T-046)                                                                                                                                                                                                                  |
| `/pomoc` signed out       | → `/auth`     | none                    | As designed (signed-in page)                                                                                                                                                                                                                         |
| Bundle                    |               |                         | Contains the Supabase URL (B-002)                                                                                                                                                                                                                    |
| Cookie banner at 375 px   |               |                         | Not shown from the US runner (region). The built-in browser in Czechia has a stored choice, so the banner position wasn't rechecked                                                                                                                  |

## T-050 visible labels (D-32, F-32)

| Form                                     | Result                                                                                                                                                                           |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sign in                                  | Pass: "E-mail" (example placeholder "např. jana@seznam.cz"), "Heslo"; button 56 px, grey until filled                                                                            |
| Sign up with e-mail                      | Pass: "Vaše jméno a příjmení", "E-mail", "Heslo" ("alespoň 8 znaků"); no "Ještě doplňte" before typing; after typing a name: "Ještě doplňte: e-mail, heslo"                      |
| Institution sign-up                      | Pass: "Název organizace", "Vaše jméno a příjmení", "Pracovní e-mail", "Heslo"                                                                                                    |
| Add cottage (`/chata/nova`, Test 3)      | Pass: "Cottage name", "Address", "City", "Rooms"                                                                                                                                 |
| New document (`/dokumenty`, Test 3)      | Pass: Title, Category, Notes, Issue date, Expiry date, Who can see it. Found: the "Filter by title" box above the list has no name (only a placeholder); fixed in T-052 (PR #82) |
| Manual sections, house rules, onboarding | Not opened                                                                                                                                                                       |

## T-051 start screen (F-33)

- Test 3 in the built-in browser: `/` → `/domu` in under 5 s.
- The stuck Brave window (maintainer, 27 Oct): moved on to `/onboarding`. Onboarding is shown only when the membership read succeeds and returns nothing, so the Brave sign-in has no MyChata account: the "signed in, no account" cause. Sign out on step 1 (T-047) can be checked there.

## Releases

One release per checked publish from now on (decided 27 Oct): `release-2026-10-27` on `dc50299` covering PRs #77–#81; the separate releases for #77–#79 are dropped. A cloud session may not create releases, so a maintainer creates it.

Source file: `docs/external/claude/2026-10-27-site-check.md` in the mychata repo.

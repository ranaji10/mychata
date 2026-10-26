---
source: claude
model: claude-opus-5-5
date: 2026-10-26
status: reviewed
artifact: none (local report only, not published as a Claude artifact)
live_commit: 27f9992
---

# Test round: mychata.cz after the PR #78 (T-048) publish, 26 Oct 2026 (evening)

Live commit `27f9992` (build 26 Oct 19:28 UTC). Public pages with Playwright from a cloud session (iPhone 13 and 1440 px, Czech and English; this sandbox can't reach Supabase, so data-backed public states were not seen). Signed-in pages as Test 3 (organisation admin, `Institutní chata (test)`) in the maintainer's built-in browser, Czech and English, read-only. Code read for the rest.

## Checked and passing

| Area                                              | Result                                                                                                                                                                             |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F-29 (T-048) on the live site                     | No React #418 with English or Czech on `/auth`, `/`, unknown path; `/auth` ends in English, `lang="en"`, English title; CZ switches back                                           |
| N-20                                              | `/soukromi` signed in: "Real numbers from Google Analytics for 28.09.2026 – 25.10.2026 (updated automatically)"                                                                    |
| Public pages (13 paths × 2 devices × 2 languages) | Titles and headings in the chosen language, no horizontal scroll, no control under 44 px, no console errors from the app, 404 page returns 404                                     |
| Headers                                           | HSTS, CSP `frame-ancestors 'self'`, `X-Frame-Options`, `nosniff`, Referrer-Policy, Permissions-Policy present. Token pages `noindex`; sitemap lists only `/`, `/auth`, `/soukromi` |
| Signed-in pages (21 routes, Czech; 3 in English)  | No `undefined`/`NaN`/ISO dates in the page text except Help's version line, no untranslated words in English apart from cottage names, no overflow, no small controls              |

## Found

| ID   | Severity               | Finding                                                                                                                                                                                                               | State                                                                            |
| ---- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| F-30 | High (security)        | Page views sent the whole address to Google Analytics. E-mail links return as `/auth#access_token=…&refresh_token=…`, so live sign-in tokens reached Google; public link tokens too. Reproduced live with fake tokens | Fixed in T-049 (PR); data already in GA: D-33                                    |
| F-31 | Medium                 | Two identical `page_view` per load; GA page counts doubled (the privacy page's "1,337 pages viewed" included)                                                                                                         | Fixed in T-049                                                                   |
| F-32 | Medium (accessibility) | About 35 fields have only a placeholder, no label; on sign-in/sign-up the hint disappears as soon as someone types, and screen readers have no name                                                                   | 22 public and setup fields get an accessible name in T-049; visible labels: D-32 |
| —    | Low                    | Privacy page showed raw `/vice`, `/profil`                                                                                                                                                                            | Fixed in T-049                                                                   |
| —    | Low                    | Institution sign-up heading twice; Approvals says "family bookings" to organisations; "Checklist" in Czech; Help's version time as ISO                                                                                | Fixed in T-049                                                                   |
| —    | Low (invariant 6)      | Task translation ignored `feature_enabled`/`bump_usage` errors                                                                                                                                                        | Fixed in T-049                                                                   |
| —    | Low (performance)      | Every signed-in page preloads the sign-in photo (~180 KB): the server renders the sign-in screen because sign-in lives in the browser                                                                                 | Noted; goes away with server-side sessions (own hosting, T-002)                  |
| —    | Low (UX)               | "Vytvořit účet" stays grey until every field is valid, without saying which is missing                                                                                                                                | Part of D-32                                                                     |

## Not checked

- Data-backed public states (calendar, manual, guest, invitation, request form) from this sandbox; they were checked live on 26 Oct morning.
- Writes beyond N-10's booking; the cookie banner from an EU address; iPhone Safari.

---

Source file: `docs/external/claude/2026-10-26-test-round.md` in the mychata repo.

---
source: claude
model: claude-opus-5-5
date: 2026-10-18
status: reviewed
artifact: none (local report only, not published as a Claude artifact)
live_commit: a8b0b84
---

# Live test: mychata.cz, signed in, 18 Oct 2026

Run 01:25–02:10 Czech time (17 Oct 23:25 – 18 Oct 00:10 UTC) on the live build `a8b0b84` (PR #50, T-037), from a cloud session. Headless Chromium through Playwright, phone size (390×844, cs-CZ) and desktop (1280×900). Signed in as **Test 2** (member of `Chata Alfa (test)`) and **Test 3** (admin of `Test Institute`, member of `Chata Alfa (test)`) with e-mail and password. **Test 1** (Google only) could not be used: Google sign-in does not work in a headless browser, so nothing here was checked as the family admin. Only the test cottages were touched; invented names and `@example.com` addresses only.

Fixes for what was found are in T-038 (`docs/tasks/T-038-live-test-fixes.md`), branch `claude/laughing-einstein-llxpc1`. They are **not live** until merged and published.

## What passed live

| Check (tracker ID)                                                                          | Result                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Every signed-in page as a member and as an institution admin (18 routes, phone and desktop) | Loads; no console errors, no failed requests, no sideways scroll, one `main` landmark on every page (the F-17 "Members and Requests lack a main landmark" item no longer applies)                                                                     |
| English mode                                                                                | No Czech text left except cottage names                                                                                                                                                                                                               |
| Debtor's side of Settle debts (F-01)                                                        | Test 2 paid 200 Kč split with Test 3; Test 3 sees "Pošlete 100 Kč osobě Test Chata 2. Jakmile platbu potvrdí, dluh zmizí." and no confirm button                                                                                                      |
| Empty Expenses page (F-01)                                                                  | "Zatím žádné výdaje." with "Přidat výdaj"                                                                                                                                                                                                             |
| A member's pending stay with admin names (F-01)                                             | Overlapping booking on the "No" cottage is held; the stay page shows "Schvaluje: Test Chata"                                                                                                                                                          |
| Demoted member's own view (F-01)                                                            | Test 3 invited Test 2 to Test Institute as admin, Test 2 accepted, Test 3 removed admin. Test 2 then sees Members without invite form or role buttons. They still see Requests with Approve/Decline and Export (open decision D-16, not a regression) |
| Invitation, wrong account (F-02)                                                            | Test 3 opening Test 2's invitation gets the "signed in as … but this invitation is for t***@gmail.com" notice and the sign-out button                                                                                                                 |
| Guest page (F-02)                                                                           | Guest link from Settings opens signed out, shows booked dates; a request (Host Claude (test), 10.–12.11.) sends and shows "Děkujeme! Žádost byla odeslána."                                                                                           |
| Public manual and its error state (F-02)                                                    | Opens signed out; an unknown token says "Veřejný manuál není k dispozici."                                                                                                                                                                            |
| Cookie banner on `/pozvanka`, public manual, guest page, request form (F-02)                | Shown flush at the bottom (top 508 of 844 px) with a simulated CZ response; covers 40% of the screen (F-03, deferred)                                                                                                                                 |
| Requests after a full reload (F-16, T-037)                                                  | New public request listed 3 s after it was sent, on Requests and on Home ("Čekající žádosti 2"). **F-16 closed**                                                                                                                                      |
| Institution request decline                                                                 | Reason dialog, "Žádost zamítnuta.", moves to Vyřízené                                                                                                                                                                                                 |

## Defects found (all fixed in T-038, not live yet)

| #   | Defect                                                                                                                                                                                                                                                                                                                           | Where                                                                    |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 1   | **Family admins cannot decide a held stay.** Since T-036 a member's overlapping booking waits for the admin, but Approve/Decline on the stay page showed only in institution accounts and Approvals sends families to the Calendar. The database allowed it all along (new test). The member also could not withdraw the request | `rezervace.$id.tsx`, `domu.tsx`                                          |
| 2   | Booking button said "Potvrdit rezervaci" when the stay would be held for approval                                                                                                                                                                                                                                                | `rezervace.nova.tsx`                                                     |
| 3   | Page titles in English on a Czech app ("Home — My Chata"); the analytics page view used the wrong title too (17 Oct site check)                                                                                                                                                                                                  | all app routes, `__root.tsx`                                             |
| 4   | Home showed "Nejbližší pobyt" twice and "Odjezd" on a stay 9 or 24 days away (F-17)                                                                                                                                                                                                                                              | `domu.tsx`                                                               |
| 5   | A 7-day invitation said "vyprší za 6 dní" right after it was made (F-17, reproduced live)                                                                                                                                                                                                                                        | `clenove.tsx`, `invites.ts`                                              |
| 6   | Wrong-account notice on an invitation was green, not a warning (F-17)                                                                                                                                                                                                                                                            | `pozvanka.$token.tsx`                                                    |
| 7   | Invitations from before 0026 without a group link had no Cancel button (F-17)                                                                                                                                                                                                                                                    | `clenove.tsx`                                                            |
| 8   | A plain member saw "Veřejný odkaz na kalendář" (Settings and Calendar); tapping it called the admin-only function: HTTP 403 and an error toast                                                                                                                                                                                   | `vice.tsx`, `kalendar.tsx`                                               |
| 9   | Manual categories shown as raw codes ("RULES", "rules", "wifi") in the app, the public manual and the category picker                                                                                                                                                                                                            | `manual.tsx`, `verejne.manual.$token.tsx`                                |
| 10  | Dates in UTC: an expense added between midnight and 2 am Czech time got yesterday's date; the public calendar's "next free weekend" was a day early (Friday–Saturday); invitation and export dates by UTC day                                                                                                                    | `vydaje.tsx`, `verejne.kalendar.$token.tsx`, `clenove.tsx`, `export.tsx` |
| 11  | Decline dialog: "1 žádostí bude zamítnuto."                                                                                                                                                                                                                                                                                      | `zadosti.tsx`                                                            |
| 12  | The service worker saved every server-function answer (consent region and others) and never removed them, so a later visit could get an old answer                                                                                                                                                                               | `public/sw.js`                                                           |
| 13  | 404 page kept the home page's title                                                                                                                                                                                                                                                                                              | `__root.tsx`                                                             |
| 14  | The stay page logged an HTTP 406 after a stay was removed                                                                                                                                                                                                                                                                        | `rezervace.$id.tsx`                                                      |

## Seen, not changed

- Home's "Nevyrovnané" tile counts every open debt in the cottage (250 Kč), not the viewer's own (100 Kč). It may be meant as a cottage total; worth a design decision.
- The booking screen lists the same overlapping stays twice (under the calendar and in the warning box).
- The Usage export counts requests by stay dates, so "Říjen 2026: 0 žádostí" while two requests were sent in October. Probably intended.
- After any change, a full reload within a minute of the last fetch shows the offline copy (the app's 60 s freshness window). Past a minute it refreshes. Not a bug; Requests already opt out (T-037).
- The privacy page names no operator ("Kontakt: správce vaší chaty"), O-11.
- Each tap on "Odkaz pro hosta bez účtu" makes a new guest link (two were made today).

## Test data left behind

- Test 2 is now a **member of Test Institute** (joined by invitation, demoted). Kept for future two-person checks; `docs/runbooks/test-cottages.md` updated.
- A pending guest request "Host Claude (test)", 10.–12.11.2026, in Chata Alfa (test): only Test 1 (admin) can decide it.
- Two extra guest links in Chata Alfa (test).
- Removed: both test expenses and Test 2's held booking (deleted by Test 2 through the database API: proves on production that the booker may delete their own pending stay, which the new "Stáhnout žádost" button relies on). Test 2's name was changed and changed back.

## Verified locally (dev server against the live database, signed in as Test 2)

Home without the duplicate and without the early checkout button; Settings without the calendar-link row for a member; "Poslat ke schválení" on an overlapping booking; the held stay's "Stáhnout žádost" with its dialog, then "Žádost o pobyt byla stažena." and no console errors; titles "Domů — My Chata", "Calendar — My Chata" after switching to EN, "Úkoly — My Chata" after switching back.

## Not verified

- Anything as a family admin (Test 1 is Google-only): the new Approve/Decline on a family stay and the "Pobyty ke schválení" card on Home. Covered by a database test and code reading only.
- The wrong-account warning colour, the old-invitation Cancel button and the 7-day count in a browser (unit test for the count).
- iPhone clipboard, Document Vault "Open" on an iPhone, avatar upload on iOS (F-01): need a real iPhone.
- Real EU visitor for the cookie banner (simulated CZ response only).

Source file: docs/external/claude/2026-10-18-site-check.md

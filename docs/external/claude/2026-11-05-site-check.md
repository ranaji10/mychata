---
source: claude
date: 2026-11-05
status: reviewed
live_commit: 7e4dec6
---

# Live test with a fresh English sign-up (5 Nov 2026, 17:00–17:10)

Live build `7e4dec6` (PR #98, T-058; `build-sha` read from `/auth`), migrations to 0040. Testers: Claude with Test 5 (new e-mail + password sign-up on a work-style domain, English; Claude in Chrome) and Test 3 (institution, Czech, phone width; built-in browser). Test 5 made the family account with `Chata Test 5 (test)`, so everything stayed in its own test cottage.

The maintainer confirmed the sign-up confirmation e-mail arrived in English (N-29 step 1, language part).

| Check                                                         | Result                                                                                                                                                           |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Onboarding, five steps, English                               | Pass, after the bugs below. Starter house rules, Summer season, overlap Yes                                                                                      |
| Rooms "-3" in onboarding                                      | **Bug.** Accepted, saved, shown as "-3 rooms" on Manage cottages                                                                                                 |
| People "-5" in onboarding                                     | **Bug.** Accepted on screen, silently dropped (capacity listed as missing)                                                                                       |
| Guests at once "2.5"                                          | **Bug.** Setup failed with only "Something went wrong. Please try again."; the console logged `Object`                                                           |
| Edit cottage details, rooms "0"                               | **Bug.** "Cottage details saved." but nothing changed                                                                                                            |
| City / Rooms fields side by side                              | Minor: the Rooms input sat lower than City (hint text above it)                                                                                                  |
| New booking, departure before arrival                         | Pass: "Departure must be after arrival", button off                                                                                                              |
| New booking, arrival typed as 1 Oct                           | **Bug.** "Booking confirmed" for last month (the picker greys past days; the typed date got through). The stay is not listed anywhere (list shows upcoming only) |
| New booking, 7 guests, capacity 6                             | Pass: the capacity warning, booking allowed                                                                                                                      |
| Expenses: "-500"                                              | Pass: refused                                                                                                                                                    |
| Expenses: "1 250,50"                                          | Pass: saved as 1 250.50, shown rounded to 1 251 Kč                                                                                                               |
| Seasonal checklist twice                                      | Pass, guarded; but two near-identical warnings at once                                                                                                           |
| Tasks assigned to myself                                      | 5 "Your task" items in Notifications (in-app only, no e-mail). Left as is                                                                                        |
| Invite "jana@example"                                         | Pass: "Please check"                                                                                                                                             |
| Invite own address                                            | **Bug.** Invitation created for the owner's own address (cancelled afterwards)                                                                                   |
| "Email" invitation text                                       | **Bug** against the one-language rule: Czech then English                                                                                                        |
| Profile phone "hello"                                         | Pass: refused with the expected format                                                                                                                           |
| Public calendar on a phone (signed out)                       | Pass: next free weekend, booking shown, request button                                                                                                           |
| Institution Home and Expenses at 375 px (Test 3)              | Pass, blue, no console errors                                                                                                                                    |
| Settings → Public calendar link / Guest booking link on a Mac | Opens the macOS share sheet, nothing in the page. Works, but easy to miss                                                                                        |

Fixed in T-059 (PR from `agent/claude/T-059-validation-and-payer`), with migration 0042 for O-21 (expense payer rule) and database checks for rooms and guests at once.

Not fixed, for the tracker: every tap on "Guest booking link" makes another valid link; tapping "Public calendar link" as an admin publishes the calendar without asking; a booking may end on its arrival day (0 nights).

## Test data left

In `Chata Test 5 (test)`: a stay 13–15 Nov (7 guests), a stay 1–3 Oct made through the bug (not visible in the app; delete after T-059 is live or leave), one expense "Drevo (test)" 1 250.50 Kč, the five winterising tasks, two guest links and the published calendar.

## Recheck after publish (and 0042 applied)

1. Onboarding with a fresh address: "-3" rooms, "0" people and "2.5" guests each show "Enter a whole number…" and keep Continue off.
2. Manage cottages → Edit cottage details: "0" rooms shows the line and Save is off.
3. New booking: type an arrival last month → "Arrival can't be in the past", button off.
4. Members: own address → "Already members, so not invited", button off. The Email button opens a message in one language.
5. Expenses still add and split as before (the payer is you); an admin can still enter one.

---
source: claude
date: 2026-11-06
status: reviewed
live_commit: afca307
---

# Recheck on live `afca307` (6 Nov 2026, 01:47–02:10)

Live build `afca307` (`build-sha` read from the page): PR #108 (T-064, migration 0046 applied by Lovable with marker 0047), #109 (T-065, zod 4), #106 (Dependabot), #110 (marker 0047). Testers: Claude with Test 3 (built-in browser) and Test 5 (Claude in Chrome), test cottages only.

| Check                                                                                      | Result                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| T-062 step 3 (Test 5): public calendar off, then Public calendar link                      | Pass: "Publish the cottage calendar?"; Go back leaves it off (after reload too); "Publish and share" publishes and offers the link; a second tap shares without asking. The calendar is published again, same link |
| T-062 step 4 (Test 3, not a member): public calendar of Chata Test 5, one day picked twice | Pass: "Day visit (no overnight)"; "Your request went to the cottage's admins". Test 5 declined it on Home afterwards                                                                                               |
| T-062 steps 1, 2, 5, 6                                                                     | Passed on `149736b` earlier the same night (tracker history)                                                                                                                                                       |
| O-27 (Test 3, Institutní chata): Test Chata 2's request 23 Oct–1 Nov                       | Pass: grey band in October, legend "Not decided", listed under "Requests not decided"; its detail says "Not decided", "The dates passed and nobody decided on this request.", only Decline                         |
| O-29: cottage switcher in English                                                          | Pass: "Your cottages" … "Add a cottage"                                                                                                                                                                            |
| O-26 (Test 3, member of Chata Alfa): a stay held for approval → Message the admin          | Pass on the sending side: "Message sent to the admin." with the stay attached (0046 live). The admin's side (notification opens the stay) was not seen: no admin of Chata Alfa is signed in; covered by tests      |
| T-065: a House manual question (Test 3, Chata Alfa)                                        | Pass: answered ("The sources do not contain…"), no console errors                                                                                                                                                  |

## Test data left

None. The held stay 18–19 Nov in Chata Alfa (test) was withdrawn; Test 3's day-visit request was declined; Test 5's public calendar is published again with the same link; Test 3 is back on Institutní chata (test). The admins of Chata Alfa (test) got one test message ("Please approve the stay 18.11.2026–19.11.2026 (Test 3).").

Not checked: the organisation request form (guest link) submission; the O-26 e-mail in an inbox.

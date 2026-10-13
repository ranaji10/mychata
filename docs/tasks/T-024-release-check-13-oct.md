# T-024 Release check of mychata.cz, responsive layout and onboarding fix (13 Oct 2026)

Owner: Claude Code · Status: PR open; the live checks below ran on production before this PR

Production at the time ran `main` up to PR #17 (L-2 and L-2b published on 12 Oct). Tested in the desktop app's built-in browser, signed in as a maintainer, inside the test cottage `Test chata (Claude)` only, at phone width (375 px) and at 1280 px. All records added are invented (`Testovací host (Claude)`, `test-guest@example.com`, `test-invite@example.com`, `Test: plyn (Claude)`, two generated test documents). The automated public smoke tests (6/6) were run against mychata.cz by a separate session the night before and passed.

## Release checks (`docs/runbooks/release.md`) and the gaps left by T-022 and L-2

| Check                                                | Result      | Note                                                                                                                                       |
| ---------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Pages load, signed in (19 routes)                    | pass        | No console errors; no page wider than the screen at 375 px                                                                                 |
| Guest request through the cottage's own guest link   | pass        | Past days can't be picked; dates show as plain text; "Thank you" screen                                                                    |
| Approve a guest request as admin                     | pass        | Card disappeared, stay listed in the calendar and as "Next stay"; the stay detail page opens                                               |
| Make a second member admin, then demote              | pass (half) | Done as admin with "Permissions updated." both ways. The demoted person's own view needs their sign-in                                     |
| Invitation: create, copy (clipboard refused), cancel | pass        | Link field appears beside the button, focused and fully selected                                                                           |
| Settle debts between two people                      | pass (half) | Split expense → "owes 200 Kč" → confirmed → "Everything is settled". The other person's side needs their sign-in                           |
| Document Vault: PDF and photo, ask a question        | pass        | Text PDF: "insured until 31 December 2027, policy TEST-4471". JPEG photo of a service record: "next boiler service is due on 3 March 2027" |
| Add a seasonal checklist                             | pass        | Appears collapsed ("0 of 5 done"). The page moved up only because the panel closed and the page got shorter                                |
| Tick a task                                          | pass        | Moves into "Done (1)", counter "1 of 5 done"                                                                                               |
| Task filters (All, Mine, Overdue)                    | pass        | Overdue shows the empty message; Mine shows the group                                                                                      |
| Clipboard refused on a signed-in page                | pass        | Settings → guest link: field beside the button, selected                                                                                   |
| Invalid public links                                 | pass        | Form, calendar, manual and guest links all say the link is not valid; the institution form no longer shows the full form first             |
| Pending stay seen by an admin with admin names       | not tested  | Needs a member's booking awaiting approval (a second signed-in person)                                                                     |
| Empty Expenses page                                  | not tested  | The test cottage has expenses; needs a fresh test cottage                                                                                  |
| iPhone: link selected when clipboard refused         | not tested  | Needs an iPhone                                                                                                                            |

## Found and fixed in this PR

| #   | Where                        | Problem                                                                                                     | Fix                                                                                 |
| --- | ---------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 1   | Whole app on tablet/computer | Always the 420 px phone column, with the tab bar at the bottom                                              | Tablet: 720 px column. Computer: sidebar with the tabs, content up to 820 px        |
| 2   | Onboarding                   | Still asked "Family or Institution?" although institutions now sign up separately                           | No question: institution sign-ups get the institution setup, everyone else a family |
| 3   | Sign-in page on a computer   | Phone column in the middle of a wide screen                                                                 | Picture and form side by side                                                       |
| 4   | Calendar, no bookings        | Two "Book a date" buttons                                                                                   | One                                                                                 |
| 5   | Home, no tasks at all        | "All tasks are done. You have the cottage under control."                                                   | "No tasks yet. Add the first one, or a seasonal checklist, in Tasks."               |
| 6   | Guest booking page           | "Booked dates" listed stays that are already over                                                           | Only current and future stays                                                       |
| 7   | Guest booking page           | Number-of-guests box had no label once filled                                                               | Visible label                                                                       |
| 8   | Guest booking, invalid link  | No advice what to do                                                                                        | "Ask the cottage's administrator for the current link."                             |
| 9   | Members                      | "Make admin"/"Remove admin" was an icon only; invitation actions icons only; role switch 33 px high         | Text next to every icon; 44 px minimum                                              |
| 10  | Expenses form                | Two members with the same first name looked identical ("Ranaji", "ranaji"); chips didn't expose their state | Full names when first names clash; `aria-pressed` on split chips and task filters   |
| 11  | Header on phones             | Long cottage names ran under the CZ/EN switch                                                               | Name ends with "…"                                                                  |

## Found, not changed (for the maintainers)

- Pending guest requests are not drawn on the admin's calendar (only on Home), although the legend shows "Awaiting approval". Product decision: should they be?
- `/zadosti` (institution requests) and `/export` open for a family account too. Not linked anywhere for families; harmless but odd.
- Cancelling an invitation has no confirmation or undo.
- The "+" buttons that add a photo or document are icons only (same pattern on several pages). Fine for now; revisit with the design rules.
- In the desktop app's browser, screenshots sometimes lag behind the page. Results above were read from the page itself, not from screenshots.

## Not verified

Everything that needs a second person signed in at the same time (the demoted member's own view, the debtor's side of Settle debts, a member's pending stay), iPhone clipboard behaviour, and the new tablet/desktop layout on the live site (checked locally with invented data at 375, 820 and 1440 px; check again after publishing).

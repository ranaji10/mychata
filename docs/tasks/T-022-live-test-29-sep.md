# T-022 Live test of mychata.cz after migration 0022 (29 Sep 2026)

Owner: Claude Code · Status: review

Tested in the desktop app's browser at phone size (375 px), signed in as ranaji.deb@gmail.com (admin), plus the public pages signed out. A test cottage "Test chata (Claude)" was created through onboarding with a booking, a house-rules section, a text document, an expense and a guest link; delete it when no longer needed.

## Worked

Sign-in page (three options, institute refuses Gmail, expired-link message and resend), onboarding with the name prefilled, Home, Book a date → tap arrival and departure → booking form prefilled → booking saved, public calendar with CZ/EN, My profile "Finish setting up" (saved city, rooms, season, overlap, house rules), manual question answered from the house rules with the source shown, Document Vault: text file read on upload ("Ready for questions") and a Czech question answered from it with the source, expense with a custom split, More, Members, Add a cottage, Usage export, Check-out checklist, Photos. No console errors on any of these pages.

## Found and fixed on this branch

| #   | Where                                           | Problem                                                                                                                                                                                        | Fix                                                                            |
| --- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 1   | Settle debts (`/vydaje/vyrovnani`)              | **The page never showed**: it is a child route of `/vydaje`, which had no `<Outlet />`, so the address changed but the expenses list stayed. This is why "Settle debts doesn't do anything"    | Parent renders the child when one matches                                      |
| 2   | Task detail (`/ukoly/$id`)                      | Same cause: task detail never opened                                                                                                                                                           | Same fix                                                                       |
| 3   | Everyone whose only account was the demo family | They belong to no account but had finished onboarding once, so Home loaded empty ("Hello," with no name, institution tiles, no cottage, no admin rights). This is the "there is no admin" case | Anyone with no account goes to onboarding                                      |
| 4   | Document Vault on a phone                       | Filter row wider than the screen (page scrolled sideways, 434 px)                                                                                                                              | Search field shrinks, category box fixed width                                 |
| 5   | Document Vault                                  | Categories shown as codes (`SERVICE_RECORDS`)                                                                                                                                                  | Czech/English labels                                                           |
| 6   | Questions                                       | Answer language followed the app language, not the question                                                                                                                                    | Answers in the question's language                                             |
| 7   | Public calendar with an unknown link            | Empty calendar, no explanation                                                                                                                                                                 | "This calendar link is not valid"                                              |
| 8   | Institution request form with an unknown link   | Full form shown with "Company cottage", error only at the bottom                                                                                                                               | Form hidden, clear message                                                     |
| 9   | Language switch                                 | 36 px high, below the 44 px rule                                                                                                                                                               | 44 px                                                                          |
| 10  | Privacy page                                    | Mentioned only Google sign-in; nothing about AI answers                                                                                                                                        | Email sign-up and AI processing added (wording for the maintainers to confirm) |
| 11  | Header logo "M"                                 | No accessible name                                                                                                                                                                             | "Home" label                                                                   |

## Found, not changed (for the maintainers)

- Lovable's own page analytics (`/~api/analytics`) is sent even after "Essentials only". It's a Lovable hosting feature, not the app's Google Analytics; decide whether the privacy page must mention it or whether it can be turned off in Lovable.
- Lovable re-applied 0022 as migration 0023 (identical file). Harmless because every statement is idempotent; don't let Lovable add copies in future (ask it to apply the journaled file).
- "Public calendar link" shows the raw URL in a notice when the browser refuses clipboard access. Works, looks rough.
- Guest booking page still uses two date boxes (no labels, no tap-to-pick calendar).
- Empty Expenses page shows two "Add expense" buttons.
- Not tested live: approving a guest request (the computer disconnected mid-test), inviting/demoting a second member, Settle debts with two people (needs a second account), PDF and photo reading.

Handoff note: typecheck/lint/tests not run for this branch (the computer disconnected); CI runs them.

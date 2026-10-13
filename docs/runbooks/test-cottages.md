# Test cottages

Until staging exists (T-003), every check of the live app runs on mychata.cz. Real families use the same database, so tests run only inside **test cottages**: accounts that hold invented data and that no real person belongs to. Row-level security keeps each account's data separate, so a test account cannot see a real family's cottage, and a real family never sees test records.

## The test cottages

| Cottage                     | Account owner                                            | Used by                                 | Second member                                         |
| --------------------------- | -------------------------------------------------------- | --------------------------------------- | ----------------------------------------------------- |
| `Test chata (Claude)`       | a maintainer's own Google sign-in                        | Claude's live checks (built-in browser) | the same maintainer's second email address            |
| `Testovací chata (Lovable)` | the user Lovable's preview signs in as (its own account) | Lovable's preview checks                | none yet: two-person checks stay with the maintainers |

The Lovable cottage is created by Lovable itself, in its own account, with the prompt in `prompts/2026-10-13/11-L-T-test-cottage.md` (maintainers' folder, outside the repo). If Lovable's test user ever turns out to be a member of a real family's account, stop: remove that membership first, then continue.

## Rules for every agent and person testing

1. Sign in to the test account and check the cottage name in the header before doing anything.
2. Use only links copied from the test cottage itself (Settings → public calendar link, guest booking link, Members → invitation).
3. Invented names, `@example.com` emails, amounts and documents only. Mark titles with `(test)` or the agent's name.
4. Never submit a guest request, institution form or invitation on another cottage's link, even "just to see the form".
5. Clean up what you add when it would confuse the next test (declined requests, revoked invitations). Leave the seed data below.

## Seed data the Lovable cottage should keep

- Two tasks (one overdue), and the "Winterising the cottage" seasonal checklist with one task ticked.
- One expense split between the test user and nobody else (shows "Paid by you, not split").
- One confirmed stay next month and one guest request (`Host Test`, `host@example.com`) left pending, so the approval card and the pending-stay screens have something to show.
- One small text-only PDF in the Document Vault.

An empty Expenses page and a brand-new cottage are checked by creating a second, temporary test cottage (Settings → Add a cottage) and removing it afterwards.

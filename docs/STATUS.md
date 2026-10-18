# Status

As of 2026-10-18. Update this file in every PR that changes behaviour.

## Where things are

| Place                    | State                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Production (mychata.cz)  | Runs `d52dfd0` (Lovable's sync of `main` after PR #54, T-038 and its review fixes), read from `<meta name="build-sha">` on 18 Oct (build 01:06 UTC, `docs/external/claude/2026-10-18-site-check-2.md`: public pages pass, Czech titles live). Signed-in checks of T-038 still open (tracker N-10). Last tag: `release-2026-10-18` on `9fce136` (T-036); the next one goes on `d52dfd0` (a maintainer; tags cannot be pushed from Claude's session).                                                                                                                                                                |
| Database                 | Migrations up to 0029 applied (18 Oct: 0028 via the empty marker 0029). 0021, 0025, 0027 and 0029 are empty markers; 0023 is Lovable's copy of 0022 (harmless). 0030 (T-040, `my_cottages()`, `my_invitations()`) is written, not applied. Next free number: 0031.                                                                                                                                                                                                                                                                                                                                                 |
| Backup                   | Full export taken 2026-09-25 (`Lovable DB exports/`, outside the repo). Routine: `runbooks/backup.md`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| CI                       | Green on `main` at `b50a296` (18 Oct). A pull request is format-checked only on the files it changes; a push to `main` warns about unformatted files instead of failing; everything else (migration guard, lint, types, all tests, generated docs, build, bundle check, e2e) is strict. `bun run check` locally checks the formatting of everything. Dependabot updates GitHub Actions only; npm updates come back with own hosting (T-002).                                                                                                                                                                       |
| Nightly production check | Green every day 13–17 Oct (last run 17 Oct 07:44 UTC).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Open bugs                | See "Open defects" below. B-006–B-010 (T-017) and B-011–B-017 (T-019) are merged and live.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Not yet tested live      | Tested live on 13 Oct (T-024): guest request and approval, promote/demote, invitations, Settle debts, PDF and photo questions, checklists, clipboard fallback. Passed on 14 Oct (site check 2): public pages, Czech titles, seasonal photo from `/assets/`. Still open: the signed-in release checks and two-person checks, the five onboarding steps for a family and an institution sign-up, blue screens with real data (no institutional test account), L-5c guest/invitation/manual/request states, and the cookie banner seen from an EU address (the check ran from the US, where the banner is not shown). |
| Open tasks               | T-028 L-5c public pages (merged and live, partial: see below), T-020 document vault search (planned), T-014 performance, T-015/T-016 missing tests, T-001–T-013 as listed below (T-012's migration 0019 is applied; its brief is not closed yet). Done: T-017, T-018, T-019, T-021, T-022, T-024, T-025, T-026, T-027, T-029.                                                                                                                                                                                                                                                                                      |

## Bugs of 18 Oct (T-040, not yet live; needs migration 0030)

Brief with the full table: `docs/tasks/T-040-bugs-18-oct.md`.

- Tab bar: Tasks is gone; **Notifications** (`/upozorneni`) took its place, with a badge for what you haven't seen. Tasks are **Maintenance** under Settings → Manage cottages, next to Photos, Manual and Documents. Settings' Manage cottages row opens those pages in place; the desktop sidebar lists Settings' pages while you are in Settings; the Settings tab stays lit on all of them.
- Saves no longer show an error after succeeding: the page can't be machine-translated any more (it broke React), and phone requests that hit a dropped connection are retried or preceded by a wake-up read.
- Header shows only the cottage (no account/email line); Home and Notifications ask for a name when there is none; My profile looks the same for Google and email sign-ups; password change asks for the current password.
- Switcher: every cottage of every account under its account's name. My profile: a read-only summary of accounts and cottages.
- "Available" instead of "Free"; organisations can book from the calendar; documents can be edited; the ask box keeps the conversation; in-progress tasks are marked in the list and Back keeps open checklists.
- Photos: 1000 px previews for the grid and Home (ADR-0009). No "Install app" offer (manifest `display: browser`).
- Not verified: anything in a browser (no local build in the cloud session; CI builds and runs e2e), the Supabase `current_password` behaviour on the reset link, and data-dependent screens until 0030 is applied.

## After the T-038 publish (T-039, 18 Oct 2026, not yet live)

- Calendar page: a member whose link lookup fails sees "Odkaz se nepodařilo načíst." instead of being told the calendar is switched off.
- Stay page: an admin deciding a held stay no longer sees the member's line "Správce rozhodne a uvidíte to tady.".
- Tests: `localISO` and manual-category words have unit tests; e2e checks the Czech titles of `/auth` and an invalid calendar link; `PW_CHROMIUM_PATH` lets a cloud session run e2e with its own Chromium.

## Live-test fixes (T-038, 18 Oct 2026, PR #52 and #54, live since `d52dfd0`)

- A stay held for approval (T-036) can now be decided in the app by any admin, family included: Approve/Decline on the stay page and "Pobyty ke schválení" on Home. The member who asked can withdraw it ("Stáhnout žádost"). The booking button says "Poslat ke schválení" when the stay will be held. Before this, a family admin had no way to approve a held stay.
- Page titles follow the chosen language (Czech by default); analytics page views carry the same title; the 404 page has its own title.
- Home no longer shows "Nejbližší pobyt" twice (the photo's chip opens the calendar) and offers "Odjezdové úkoly" only once the stay has started.
- Invitations: a 7-day link says "vyprší za 7 dní"; the wrong-account notice is a warning; old invitations without a group link can be cancelled.
- A plain member no longer sees a public-calendar button that fails with 403 (Settings, Calendar); "Vypnout veřejný kalendář" is admin-only.
- Manual categories show as words ("Pravidla domu", "Wi-Fi") in the app, the public manual and the picker.
- Dates use the Czech day, not UTC: an expense added after midnight, the public calendar's next free weekend, invitation and export dates.
- The offline service worker no longer stores server-function answers (cache renamed to v2, old entries dropped).
- Review follow-up (PR #52 review): a member's "Veřejný odkaz na kalendář" re-reads from the database whether the calendar is still published, and says so if the admin switched it off, instead of copying a dead link. Lovable prompt 21 (`docs/external/claude/2026-10-18-lovable-prompt-21.md`) and Knowledge rules 13–15 go with the publish.

## Release check fixes (T-036, 18 Oct 2026, live since `9fce136`)

- "No" to overlapping stays now counts: a plain member's booking that overlaps another stay goes to the admin for approval, as does one that takes the guests of any one night above the saved limit. The database also checks changed dates or guests, and a member can no longer approve their own held booking. Same-day changeovers are not overlaps; admins' own bookings stay confirmed. The booking screen says which applies.
- Only the account's founder (the oldest member with a sign-in) can turn a family account into an organisation's; another admin gets "Only the person who set up this account can convert it". Each conversion is written to the audit log, and another admin can no longer demote the founder.
- Signing out removes the offline copy of the person's data from the browser, even when the copy is written again just after sign-out (seen live from My profile).
- Requests (institutions) reloads the list when opened from inside the app (after a full page reload, T-037 makes it fresh too); the public request page no longer promises an email.
- Members see "Start my own cottage" instead of "Add a cottage" (Manage cottages and the switcher); the open cottage's badge says "Currently open". Invitation page no longer repeats the name when account and cottage are called the same.

## Bugs of 17 Oct (T-035, 17 Oct 2026, not yet live; needs migration 0026)

- Bug 1: a tab left open across a release reloads once instead of showing "This page did not load" (stale code-split chunk; `src/lib/stale-chunk.ts`). Not reproduced on the live site in the same account; cross-account switching to be re-checked after publish.
- Bugs 2 and 13: the line above the cottage name shows the account only when it differs from the cottage name, and marks organisations ("Organisation · …"). My profile says "Signed in as <email>" and lists every account with family/organisation and role. Desktop sidebar no longer has "Add a chata".
- Bug 3: link preview image is the stacked logo (picture over "mychata.cz") inside the middle square of 1200×630 (`brand/logo-stacked.png`).
- Bug 4/4a/4b: the reset link opens "New password" and then continues signed in (Home, or onboarding if no cottage). Google sign-ups are offered a password after onboarding and in My profile. Every password field has a show/hide eye.
- Bugs 5 and 6: My profile has a photo, Set/Change password and "Add an institutional account" (convert a family account, add a new organisation cottage, or start the institution sign-up with a work email, which then invites the personal email as admin).
- Bug 7: Settings → Manage cottages (`/chaty`): every cottage, organisation badge, photos, manual, documents, house rules, add a cottage, and "Finish setting up".
- Bug 8: "No" to overlapping stays is stored (`properties.overlap_allowed`); house rules are no longer listed as missing.
- Bug 9: "Check-out checklist" is now "Checkout Tasks" / "Odjezdové úkoly".
- Bugs 10–12: one invitation link per batch (`invitations.group_token`), usable only by the listed emails; batches show as one tile with created date, days to expiry, who joined, See all; expired batches get "Create a new link".
- Bug 14: booked days show who is booked on hover (desktop); under the calendar a notice lists who already has the picked dates (phones and desktop). Picked days that are already booked get a dot.

## Site check 4 fixes (T-034, 15 Oct 2026, not yet live)

- Cookie banner on phones sits flush on the bottom edge (top corners round); inside the app it still floats above the tab bar. How much of the screen it covers is unchanged (deferred).
- Seasonal photo: phones get an 800px copy (about 180 KB instead of 380 KB) via `srcSet`.
- `/verejne/zadost/<invalid>` now has a heading. The "photo downloaded twice" finding was not reproduced (one request per load).

## Version marker and two public-page fixes (T-033, 15 Oct 2026)

- Every page's `<head>` now says which commit it was built from and when: `<meta name="build-sha">` and `<meta name="build-time">` (set in `vite.config.ts`). Replaces Lovable's `data-commit-sha`, which disappeared with its visitor analytics. If Lovable's build has no git history, `build-sha` reads `unknown` and `build-time` is the fallback; the first publish shows which.
- `/host/<token>`: the loading screen uses the same frame as "Tento odkaz už neplatí", so the page no longer jumps (CLS 0.11 in site check 3). `/verejne/zadost/<token>`: an invalid link no longer shows the placeholder name "Firemní chata".

## Public calendar can be switched off (T-032, 15 Oct 2026)

- Settings shows "Vypnout veřejný kalendář" while a cottage's public calendar is on; after a confirmation the link stops working. The database function existed since 0012; only the button was missing. Not live until merged and published.

## lovable-sync kept current (T-031, 14 Oct 2026)

- Lovable follows `lovable-sync` only. A new workflow, `.github/workflows/sync-lovable.yml`, fast-forwards `lovable-sync` to `main` after every merge, and leaves it alone with a warning when Lovable has unmerged commits there. Runbook: `docs/runbooks/two-person-workflow.md` (Branches).

## Own logo and icons (T-030, 14 Oct 2026)

- The browser-tab icon, home-screen icons and link-preview image now come from MyChata's logo in `brand/` instead of Lovable's heart and Lovable's screenshot. Transparent icons; the tab icon is a simplified cabin that reads at 16–32 px. One command, `bun run brand`, regenerates them all (`brand/README.md`). Lovable Knowledge rule 12 keeps Lovable from adding its own.
- Not live until merged and published. Lovable's visitor analytics, its "Edit with Lovable" badge and its own social-image choice are settings in Lovable, changed by a maintainer (prompt `prompts/2026-10-14/18-L-6-lovable-cleanup.md`).

## Fresh air L-5c (T-028, PR #31, live 14 Oct 2026)

- Public and signed-out pages restyled: landing, sign-in and its sub-screens, reset password, onboarding, invitation, guest booking, public calendar, public manual, institution request form, 404 and error pages. Czech titles and link previews on all nine routes, `noindex` kept. A new "Registrovat instituci" button on the sign-in page opens the existing institution sign-up (a separate request, not in the T-028 brief).
- Onboarding keeps the T-024 rule: the account type comes from sign-up (`signup_kind`), not from a choice in onboarding. Lovable had added a Family/Institution selector; it was removed in 0f63c77 after the PR #28 review.
- Review fixes (PR #31 review): reset password now says when the email could not be sent; the public manual's "Nahlásit neaktuální" says when it fails; the onboarding answers save logs its error; the landing page no longer shows sign-in buttons under "Otevírám vaši chatu".
- Partial delivery. Not verified: guest, invitation, manual, institution-request, error and success states in a browser; anything with an institutional account; the cookie banner on `/pozvanka` and public pages; the five onboarding steps after the selector was removed. The calendar's other-month dates fail contrast (2.25:1), fixed separately in T-029. Report: `docs/external/lovable/2026-10-14-l5c-public-pages.md`. Reviews: `docs/external/claude/2026-10-14-pr28-review.md`, `2026-10-14-pr31-review.md`.

## Fresh air L-5a and L-5b (merged 14 Oct 2026, PR #22 and PR #25)

- **L-5a (PR #22):** exact supplied design rules replace coral/cream; family green, institution blue, Plus Jakarta Sans, semantic tokens, pill controls, shared brand propagation, seasonal Prague fallback photos. Shell, shared bits, sign-in, Home and Calendar restyled; other pages only pick up tokens and receive requested brand/photo hooks. Report: `docs/external/lovable/2026-10-14-l5a-foundation-review.md`.
- **L-5b (PR #25):** restyles Tasks, Expenses, Stays, Cottage, People/settings and shared UI (Button, AlertDialog, Sonner, ConfirmDialog). Replaced asset pointers with bundled seasonal photos. Report: `docs/external/lovable/2026-10-14-l5b-pages-review.md`. Review: `docs/external/claude/2026-10-14-pr25-review.md`.
- **T-027 (PR #26, merged):** fixes PR #25 review findings: delete button green hover/active override via `btn-danger-soft`, icon sizes restored in `TaskGroup.tsx` and `vice.tsx`, cookie consent banner positioned at bottom edge on pages without a mobile tab bar and above the 84px bar inside AppShell below `lg`. Lovable reports moved to `docs/external/lovable/`. Next: L-5c (public pages, onboarding and full blue check, brief T-028).
- **Still open:** blue screens with real data (approvals, institution requests, export; no institutional test account) and the signed-in release checks. The seasonal photo loads from `/assets/` on the live site (checked 14 Oct), and `release-2026-10-14` is tagged.

## T-026 (2026-10-13)

- Lovable's editor preview loads again (B-018: the development server didn't read `.env.production`; `.env.development` now carries the same public values, and a test keeps the two identical).
- Photos no longer crash after a reload (B-019), and 16 more fixes from the open-defects list, a code review and a live test in the test cottage: Approvals no longer lists confirmed stays, an offline start no longer signs people out, a failed read no longer sends members to onboarding, "Cancel stay" only for the booker or an admin with a confirmation, pending guest requests on the admin's calendar, `/zadosti` and `/export` closed to families, confirmations before cancelling an invitation or deleting a photo or document, a safe usage-export CSV, no duplicate tasks from double taps, and three B-005/T-014 items. Full list and checks: `docs/tasks/T-026-preview-and-defects.md`.
- Not live until merged and published. Not verified: the Lovable preview itself (after merge), anything on mychata.cz with this code.

## L-4 and T-025 (2026-10-13)

- L-4 (Lovable, PR #19, live): admins can delete a task after a confirmation; the expense form starts with the current member selected and explains when nobody is picked.
- T-025 (this PR): a deleted or unknown task page says so instead of staying blank; a delete that row-level security refuses is reported instead of shown as success; rounded confirmation on phones. Record: `docs/tasks/T-025-l4-followups.md`.

## T-024 (2026-10-13, merged in PR #18)

- Layout follows the screen: phones unchanged; tablets (768px+) get a 720px column; computers (1024px+) get the tabs in a left sidebar and content up to 820px. Sign-in shows picture and form side by side on computers; public pages widen to 640–720px. Design rules updated (`docs/product/design.md`).
- Onboarding no longer asks "Family or Institution?". Institution sign-ups (signup_kind "institution") get the organisation step; Google and personal email sign-ups become families.
- Release-check fixes: one "Book a date" on an empty calendar, Home tip when there are no tasks, past stays hidden on the guest page, labelled guest count, advice on an invalid guest link, text on member and invitation buttons (44px), full names on clashing expense chips, `aria-pressed` on toggle chips.
- Lovable gets its own test cottage and two new Knowledge rules (10: test cottage only; 11: no package changes unless asked). Runbook: `docs/runbooks/test-cottages.md`.
- Verified: `bun run check` (86 tests), `bun run build`; layouts at 375/820/1440px against a local build with invented data; live checks listed in the T-024 brief. Not verified: the new layout on mychata.cz itself.

## L-2 UI batch (2026-10-12, preview only)

- Tasks are grouped by the existing checklist ID/title, oldest first; new groups start collapsed at the bottom. Standalone tasks remain above groups. Each group shows completion totals and a collapsed Done section.
- Pending stays show active-account administrators' names only and the next-step explanation. No messaging, approval rules, auth, migrations, or server functions changed.
- Clipboard failures show a short explanation and a selectable link field on Calendar, Settings, Members, Manual, and Public calendar. Empty Expenses already has one Add expense action and was left unchanged.
- Guest booking reuses CalendarMonth and pickRange, with labeled read-only arrival/departure values; submission fields remain unchanged.
- Verified: latest main present (sync-check, no warnings); preview build OK after edits and package update; changed-file lint has no errors (existing calendar Fast Refresh warning); 28 existing date/task/invitation tests pass; generated docs check passes. Phone-width browser checks at 375px: isolated synthetic checklist expands, shows 3 of 8 done, hides/reveals completed tasks, no horizontal overflow; real guest link picks 20–22 October without submitting or exposing guest names; no browser errors.
- Not verified: saving/toggling real tasks, adding a real checklist and scroll preservation, pending-stay display with real data, clipboard denial through an authenticated page, or real empty Expenses. The requesting user's minted session reaches onboarding, so these authenticated checks remain blocked. No test bookings or tasks were written.
- Not published: this batch needs a human-reviewed green CI result and the first release tag; the requested post-publish "file 10" was not supplied.

## L-2b PR #16 review fixes (preview only)

- Clipboard denial fields now appear beside the triggering action, focus and select the link, and retain a mounted status region.
- Task filters hide nonmatching checklist groups, open matching groups and count matching tasks only; failed task reads show a retry action.
- Stay cache keys include the active account; failed or missing stays show a plain missing-state message. Guest dates have picking guidance and plain-text styling.
- Verified with isolated synthetic data at 375px: all five clipboard locations, Settings/invitation origin switching, filtered counts/open states/empty states, task error and retry, missing stay and separate account cache keys, guest date selection. No real guest links or member details were accessed; no records were submitted. Browser reported no page errors. Existing date/task/invitation tests: 28 passed. Automatic preview build passed.
- Not verified: real checklist addition/scroll preservation, pending administrator names with real data, hosted PR CI or merge status. Not published; wait for PR #16 to merge.
- Changed-file inventory and phone-width checks: `docs/l2b-review-checks.md`.

## Open defects

From the "Open defects" table of the critical review (`docs/external/claude/2026-09-25-critical-review.md`, state of 4 Oct). "CC-", "L-" and "next step" are prompt and step names in that review.

| Defect                                                              | State                                                                                                                                                                                                                                                                                                                                                                                                                | Next                                               |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Not yet tested live                                                 | Tested live on 13 Oct (T-024, `docs/tasks/T-024-release-check-13-oct.md`): guest request and approval, promote/demote, invitations, Settle debts, PDF and photo questions, checklists, clipboard fallback. Still open: the demoted member's and the debtor's own views and a member's pending stay (need a second person signed in), the empty Expenses page, iPhone clipboard, and the new layout on the live site. |
| Lovable's page analytics runs after "Essentials only"               | A Lovable hosting feature, not the app's Google Analytics                                                                                                                                                                                                                                                                                                                                                            | Maintainers' decision (next step 5)                |
| B-004: Google sign-in fails on Brave                                | In Lovable's sign-in broker; email sign-up works                                                                                                                                                                                                                                                                                                                                                                     | Ask Lovable about using our own Google credentials |
| Missing security headers (Content-Security-Policy, X-Frame-Options) | Lovable hosting sets them                                                                                                                                                                                                                                                                                                                                                                                            | Ask Lovable; otherwise Model B                     |
| "Confirm email" for password sign-ups not verified                  | Someone could claim a relative's seat by email match                                                                                                                                                                                                                                                                                                                                                                 | L-E turns it on                                    |
| iPhone photos (HEIC) can't be converted in Chrome or Firefox        | The app explains how to switch the iPhone to JPG; Safari works                                                                                                                                                                                                                                                                                                                                                       | Optional: a HEIC converter in the browser          |
| B-005: Firefox desktop session findings                             | Three T-014 items fixed in T-026 (claim once per page load, one signing request for photos, AI time limits). Left: CORS/HTTP3 on Supabase hosting (watch)                                                                                                                                                                                                                                                            | T-014 rest, T-002                                  |

## Defects found on 2026-09-25 and their state

"Proven" means a test in `supabase/tests/before-fix.test.ts` reproduces it on the old schema.

| #   | Defect                                                                                      | Proven       | Fixed on branch                 | Test                                                    |
| --- | ------------------------------------------------------------------------------------------- | ------------ | ------------------------------- | ------------------------------------------------------- |
| 1   | Manual chunks readable across accounts, and by anonymous callers, via `match_manual_chunks` | yes          | 0014                            | security.test.ts "tenant isolation"                     |
| 2   | RAG never stored an embedding (`lang` column missing, 3,072 vs 768 dims, errors ignored)    | yes (schema) | 0014 + `manual-qa.functions.ts` | needs live AI key to verify end to end                  |
| 3   | All PUBLIC manual sections listable by anyone                                               | yes          | 0012                            | "anonymous access"                                      |
| 4   | Address and booked dates by property id                                                     | code review  | 0012                            | "anonymous access"                                      |
| 5   | Make/remove admin always failed                                                             | yes          | 0011 + `clenove.tsx`            | "roles"                                                 |
| 6   | Guest booking submissions refused                                                           | yes          | 0012 + `guest.functions.ts`     | "guest and institutional forms"                         |
| 7   | One account per person; invites to existing users failed                                    | code review  | 0011                            | "multi-account membership"                              |
| 8   | Public request form tied to the demo institution                                            | code review  | 0012 + routes                   | e2e `public.spec.ts`; demo data removed by 0019 (T-012) |
| 9   | Any member could edit/delete everyone's bookings, expenses, settlements                     | code review  | 0013                            | "row ownership"                                         |
| 10  | Admin-only document files readable by members                                               | code review  | 0013                            | "row ownership"                                         |
| 11  | No limits on AI calls or public forms                                                       | code review  | 0012, 0015                      | "usage limits", "guest ... rate limited"                |
| 12  | Local copy not runnable (key typo, stray lockfile, uncommitted reformat)                    | seen         | yes                             | n/a                                                     |
| 13  | A member could set their own role to ADMIN (latent until roles moved to `members.role`)     | yes          | 0011                            | "roles"                                                 |
| 14  | `bun.lock` points at Lovable's private package cache, so installs fail outside Lovable      | seen         | CI workaround                   | CI step                                                 |

## Walkthrough bugs of 2026-09-26 (T-017)

Merged in PR #8 (28 Sep) and **live** (confirmed by the 28 Sep network recording). The tests run in CI on every PR.

| Bug   | What                                                                    | State                                                                                                              | Test                                                   |
| ----- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| B-006 | Handover could only be saved with every item ticked                     | merged (PR #8), live                                                                                               | `data.test.ts` "handover checklist" + manual check     |
| B-007 | Photo upload hid the real error; no resize; `makePrimary` ignored error | merged (PR #8), live                                                                                               | `photos.test.ts` + manual check (resize needs browser) |
| B-008 | Profile phone empty after save and reload                               | merged (PR #8), live; root cause not confirmed                                                                     | security.test.ts "profile phone (B-008)"               |
| B-009 | Expense with no one else in the split shown as "Settled"                | merged (PR #8), live                                                                                               | `data.test.ts` "expense settlement"                    |
| B-010 | Assignee list must follow `current_account_id()`                        | merged (PR #8), live; write-side gap not confirmed closed (0019, named here earlier, became the demo-data removal) | security.test.ts "assignee list (B-010)"               |

## Verified (2026-09-25)

- `bun run check`: lint 0 errors, typecheck clean, 35 tests pass (security 20, before-fix 6, policy lint 4, unit 5), generated docs current.
- `bun run build` succeeds.
- Playwright public smoke tests: 5/5 against a local dev server.
- Lovable (independently): migrations applied without data loss; share tokens present on every chata; app builds.
- Not verified yet: signed-in flows in a browser, AI answers with a real key, the account switcher UI, public links in a private window (T-001 step 5).

## Verified (2026-10-12, T-023)

- `bun run check` on the T-023 branch: lint 0 errors, typecheck clean, formatting clean, 86 tests pass (7 files), generated docs current.
- Playwright public smoke tests: 6/6 against https://mychata.cz from a maintainer's computer.
- CI on the T-023 pull request (#15): `check` green, including the new step that format-checks only the changed files.
- Not verified: the warning-only format step on a push to `main` (first runs when T-023 merges) and the nightly check on GitHub itself (run it once by hand after the merge).

## Known limitations still open

See `docs/tasks/` for each: applying migrations (T-001), own hosting (T-002), staging (T-003), signed-in e2e (T-004), email (T-005), error monitoring (T-006), RAG worker and test set (T-007, T-008), billing integration (T-009), direct bookings and guest registration (T-010), calendar sync (T-011), demo data removal (T-012: done by migration 0019, brief still to close), `account_id` on child tables (T-013).

---
source: claude
model: claude-opus-5-5
date: 2026-09-25
updated: 2026-10-25
status: reviewed
artifact: https://claude.ai/code/artifact/de927c20-385c-481b-946a-49c085e87bf1
tab: Now
---

> Copy of the "Now" tab of the Claude doc "MyChata: tracker and critical review". The doc is the working copy; Claude refreshes this file whenever it edits that tab. Agents: this file is the only one you need to start; open the other tabs' copies (`.backlog.md`, `.reference.md`, `.history.md`) only when an ID or task points there. Test sign-ins appear here as Test 1, 2, 3 (the repo is public).

# MyChata tracker

25 Oct 2026 · Tuik

**Live:** `06d9db3`, published 25 Oct about 01:50: T-043 (tab order, booking requests from the public calendar, analytics events, GA numbers on the privacy page, F-03, F-06), T-044 and migration 0034 (applied via Lovable's marker 0035). Site check passed (`2026-10-25-site-check.md`). Google Analytics settings changed in GA4 itself (`docs/runbooks/analytics.md`). **Waiting on you:** merge PR #69 (N-17), the visitor sign-up test (N-14), decisions D-26 to D-30. Every row has an ID: **N** next step, **D** decision, **F** defect, **O** backlog.

## Next up

| ID | Step | Owner | Status | Unblocks |
| --- | --- | --- | --- | --- |
| N-17 | **Merge PR #69** (Lovable's commits: marker 0035 that applied 0034, regenerated `types.ts`; reviewed 25 Oct, CI green, nothing else changed). Until it is merged, `lovable-sync` stays ahead of `main` and the sync workflow leaves it alone | You | To do | N-8 |
| N-14 | **Finish the T-043 checks** (live since `06d9db3`; site check 25 Oct passed: headers, tab order, privacy numbers, request form answers correctly). Left for you: in `Testovací chata (Lovable)` open the public calendar signed out (private window) → "Požádat o termín" → sign up with a fresh e-mail → confirm → back on the calendar → send; approve as admin; check "Schválil(a)" on the stay and "Vaše žádosti" (once with the confirmation link opened in another browser: F-24); the cookie banner on a phone. Left for Claude: star the key events in GA once `sign_up` etc. appear | You, then Claude | Doing | F-24 |
| N-15 | **Review the Czech content draft** (G-1, written by Claude): `docs/external/claude/2026-10-25-g1-content-draft.md`. Correct it; a PR then adds `docs/content/` for L-3 | You | To do | N-5 |
| N-16 | **Approve or reject ADR-0012** (PR #67, document search re-plan): full-text answers up to 150,000 characters per cottage, stop the unused embeddings on save, T-007 on hold. Yes → Claude stops the embeddings | You | To do |  |
| N-10 | **Remaining T-042 checks** (passwords on the live site are yours to type): as Test 3, answer the auto-approval prompt in Members & permissions; as Test 2 in `Institutní chata (test)` a booking is confirmed at once and shows in Test 3's Notifications; as Test 1, rename `Chata Alfa (test)`; password change via the reset link (Test 2). Seen 25 Oct as Lovable's test user: the rename prompt shows for `Testovací chata (Lovable)` | You | To do |  |
| N-3 | **Remaining iPhone checks** on a real iPhone: clipboard, Document Vault "Open", avatar upload. All pass in Chromium's iPhone emulation (18 Oct) | You, Rajat | To do | F-01 |
| N-4 | **Public calendars of the test cottages:** `Testovací chata (Lovable)` is on (25 Oct). Leave it on for N-14's request test, then switch it off (Settings → "Vypnout veřejný kalendář") and check the other test cottages | You | To do |  |
| N-5 | **E-mail:** `notify.mychata.cz` failed verification (15 Oct). Check its DNS records in Lovable's e-mail settings and at the registrar. Then L-E (`05`), CC-3 (`06`) and L-3 (`07`, after N-15). Also turns on "Confirm email" (F-07, F-23) | You | To do | F-07, F-23 |
| N-8 | **Tag the release:** after N-17, tag `release-2026-10-25` on the merge of PR #69 (live `06d9db3`) (GitHub → Releases → Draft a new release; Claude's session can't push tags) | You | To do |  |
| N-9 | **Test account labels in Lovable's Knowledge:** Test 1, 2, 3 as in `docs/runbooks/test-cottages.md` | You | To do |  |

## Decisions waiting on you

Pick a Decision. "Ignore" rows are removed at the next update; "Focus later" rows stay until they become an N row; anything with a note, write the ID in chat or comment on the row.

**New 16 Oct:** D-18 to D-21 decide pricing (Reference, section 10). **New 18 Oct:** D-22 to D-25. **New 25 Oct:** D-26 to D-30 (analytics, HEIC, public-calendar visitors).

| ID | Question | Why it matters | Raised | Decision |
| --- | --- | --- | --- | --- |
| D-01 | Why did Lovable lose `lovable-sync` on 14 Oct? | If its GitHub connection keeps dropping, every Lovable round needs a rescue like PR #31. After any reconnect, check the ruleset bypass list | 12 and 14 Oct | |
| D-02 | The institution button's blue shows only on its icon. Does it read as "for institutions" on a phone? | If not, the next design round adds a blue secondary button | 14 Oct | |
| D-03 | Should an institution be able to change its account type later? | If yes, it belongs in Settings with a server-side check, not in onboarding | 14 Oct | |
| D-04 | Who merges, you or Rajat? | With 0 approvals, the reviewer report is the only gate; it must show real `bun run check` output | 14 Oct | |
| D-05 | Delete confirmations stay red only because of the order styles are built in | Cleaner: give them the red button style directly | 14 Oct | |
| D-06 | Should institutions get their own logo or name in the header, not only blue? | Institutions may expect their own branding before they pay | 14 Oct | |
| D-07 | Do any real cottages have photos? | Their members hit the Photos crash until PR #21; a short "it's fixed" note may help | 13 Oct | |
| D-08 | Do any real institution accounts exist? | If one used Approvals before PR #21, a confirmed stay may have been declined and deleted | 13 Oct | |
| D-09 | Should an AI agent ever change live code without your review? | If not, drop Lovable's "Fix error" button from both your habits | 13 Oct | |
| D-10 | Should Rajat see the design canvas? | It is private to you until shared from its Share menu | 13 Oct | |
| D-11 | Check new screens at Czech label length first? | Czech runs longer ("Čeká na schválení" vs "Pending") | 13 Oct | |
| D-12 | Do you and Ranaji both use the `ranaji10` GitHub account? | GitHub and the sync check can't tell you apart | 12 Oct | |
| D-13 | Get warned when someone changes the rulesets? | Nobody is notified; glance at each ruleset's History after a release | 12 Oct | |
| D-14 | Should `lovable-sync` also block force pushes? | A Lovable force push could wipe commits put there by hand; ask Lovable first | 12 Oct | |
| D-15 | Uploaded documents (deeds, insurance) are read by Lovable's AI gateway: keep, or switch `ai_documents` off? | The privacy page says so since T-022; ADR-0004 is still open | 29 Sep | |
| D-16 | Should only admins approve institution stay requests? | Guest requests are admin-only since migration 0022; the institution queue was left open | 29 Sep | |
| D-17 | Make `bun run docs:gen` automatic when a migration or route changes? | A forgotten regenerate turned CI red on 28 Sep | 28 Sep | |
| D-18 | Adopt pricing v2 (Reference, section 10)? Families stay free; institutions pay first (9,900 Kč per object a year); Rodina Plus at 1,490 Kč a year once the rental toolkit ships | Replaces Gemini's draft and the 25 Sep table. Unlocks P-1 and P-10 and sets what the O-12 interviews test | 16 Oct | |
| D-19 | Founding offer: Rodina Plus at 990 Kč a year, locked for 3 years, for the first 100 accounts? | Gemini's "forever" price can never be raised; a 3-year lock can. Sets P-4 | 16 Oct | |
| D-20 | Institution pilots: free until 30 Sep 2027 for the first 3, in return for a named contact, monthly feedback and list price afterwards? | Sets P-3's backfill and what existing institutional accounts (D-08) are told | 16 Oct | |
| D-21 | Who sells: you, Rajat, or a company you both own (O-11)? | No invoice, terms or payment account without a seller; it also decides VAT status and the business split | 16 Oct | |
| D-22 | "Owner" = the account's founding member (founders are stored as admins; no owner role exists). Keep that, or store an explicit owner (and owner transfer) before billing (T-009)? | Decides who may convert an account and, later, who pays. If the founder leaves, the next-oldest member becomes owner; in accounts older than sign-in, an unclaimed early member row could make its claimer the founder (worth a data check) | 18 Oct | |
| D-23 | Should an admin's own overlapping booking also wait, or stay confirmed (as built in T-036)? | With "No" to overlaps, admins can still double-book; the screen warns them | 18 Oct |Answered 18 Oct with the T-042 request: an admin's own booking is always confirmed (ADR-0010). Confirm or reopen |
| D-24 | Lovable's own platform updates (its build package, files under `src/integrations/`): accept them as they come, but ask that they arrive in a separate commit, never mixed into a migration or app round (as on 17 Oct)? | Mixed rounds make a broken publish harder to trace; the runbook now says how to handle them (two-person-workflow, "Lovable platform updates") | 18 Oct | |
| D-25 | Home's "Nevyrovnané" tile shows every open debt in the cottage (250 Kč), not what the viewer owes or is owed (100 Kč for Test 3). Keep the cottage total, or show "you owe / you are owed"? | Members aged 45–68 may read it as their own debt | 18 Oct | |
| D-26 | Turn on Google signals and user-provided data in GA4? | Both need accepting Google's advertising / user-data policies and a privacy-page update. They add demographics, interests and cross-device counts; with ad consent always denied they add little until the banner asks for it | 25 Oct |  |
| D-27 | Send a pseudonymous user ID to GA (the account's internal id, never the e-mail)? | Counts one person across phone and computer; needs a line on the privacy page | 25 Oct |  |
| D-28 | The privacy page's GA numbers are a snapshot Claude copies by hand. Make them live (GA Data API, a service-account key as a hosting secret)? | No manual refresh, but a key to hold and a server call per view; the snapshot is honest and costs nothing | 25 Oct |  |
| D-29 | Add a HEIC converter for iPhone photos in Chrome and Firefox (F-08)? | A new package (about 1 MB, loaded only when a photo is picked) | 25 Oct |  |
| D-30 | An approved public-calendar request books the stay under the visitor's name but doesn't make them a member (ADR-0011). Should approval also offer them an invitation? | Repeat visitors would book in the app instead of asking each time; members see more than a visitor should | 25 Oct |  |

## Open defects

| ID | Defect | Why still open | Next | Status |
| --- | --- | --- | --- | --- |
| F-01 | Not yet tested on a real iPhone: clipboard, Document Vault "Open", avatar upload | Needs an iPhone; all pass in Chromium's emulation | N-3 | Waiting |
| F-05 | B-004: Google sign-in fails on Brave | In Lovable's sign-in broker; e-mail sign-up works | Ask Lovable about your own Google credentials | To do |
| F-07 | "Confirm email" for password sign-ups not verified | Someone could claim a relative's seat by e-mail match; public-calendar requests rely on it too | L-E turns it on (N-5) | Waiting |
| F-08 | iPhone photos (HEIC) can't be converted in Chrome or Firefox | The app explains how to switch to JPG; a converter is a new package | D-29 | To do |
| F-09 | B-005: slow CORS / HTTP/3 errors on Supabase hosting (Firefox) | Three other B-005 items fixed in PR #21 | Watch; T-002 | Waiting |
| F-21 | Google Analytics tag diagnostics: "0 % consent rate" | The duplicate head script is fixed (live 25 Oct). Ad consent is always denied by design, so the warning stays unless D-26 changes that | Recheck tag diagnostics in a week | Waiting |
| F-23 | Public-calendar requests: the 20-a-day cottage limit can be used up by throwaway accounts while "Confirm email" is off (PR #66 review) | Low; depends on F-07 | N-5 | Waiting |
| F-24 | After sign-up, returning to the calendar when the confirmation link is opened in another browser is untested (PKCE may not sign that browser in) | Needs a real sign-up on the live site | N-14 | Waiting |

## How to use this doc

- **Status and Decision:** set the dropdowns yourself. Claude needs nothing for that.
- **A few inputs at once:** one chat message with IDs, e.g. "N-2 done, test address is …; D-04 Rajat; D-09 never". Cheapest for Claude: it finds only those rows.
- **A question about one row, or a record you want kept:** comment on the row. Send it to Claude, or leave it and say "process comments" later.
- **Tabs:** Now is the only tab you need day to day. Backlog holds open work that isn't next. Reference holds the 25 Sep review (ecosystem, billing, market, build system, RAG). Done & history holds everything finished, oldest first.
- **Rules Claude keeps:** IDs never change or get reused; a finished row moves to Done & history; this tab stays short. Repo copy of this tab: `docs/external/claude/2026-09-25-critical-review.md`; other tabs: same name plus `.backlog`, `.reference`, `.history`.

---

Source file: `docs/external/claude/2026-09-25-critical-review.md` in the mychata repo.

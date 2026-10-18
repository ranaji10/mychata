---
source: claude
model: claude-opus-5-5
date: 2026-09-25
updated: 2026-10-18
status: reviewed
artifact: https://claude.ai/code/artifact/de927c20-385c-481b-946a-49c085e87bf1
tab: Now
---

> Copy of the "Now" tab of the Claude doc "MyChata: tracker and critical review". The doc is the working copy; Claude refreshes this file whenever it edits that tab. Agents: this file is the only one you need to start; open the other tabs' copies (`.backlog.md`, `.reference.md`, `.history.md`) only when an ID or task points there. Test sign-ins appear here as Test 1, 2, 3 (the repo is public).

# MyChata tracker

18 Oct 2026 · Tuik

**Live:** `d52dfd0` (T-038 and its review fixes, PR #52 and #54), published 18 Oct 03:06, migrations up to 0029. Site check 2 on 18 Oct (`2026-10-18-site-check-2.md`): public pages pass, Czech titles live. Re-read of every change from `9e52d10` to `b50a296` (T-039): all correct; two small fixes and test updates in PR #57. **Waiting on you:** the signed-in T-038 checks (N-10), tag `release-2026-10-18b` on `d52dfd0` (N-8), merge PR #57 and publish it (N-11). Every row has an ID: **N** next step, **D** decision, **F** defect, **O** backlog.

## Next up

| ID | Step | Owner | Status | Unblocks |
| --- | --- | --- | --- | --- |
| N-3 | **Remaining two-person checks:** passed live on 18 Oct with Test 2 and Test 3: a demoted member's own view, the debtor's side of Settle debts, a member's pending stay with admin names, the empty Expenses page. Still open: iPhone clipboard, Document Vault "Open" on an iPhone, avatar upload on iOS (`prompts/2026-10-13/12-release-two-person-checks.md`) | You, Rajat | To do | F-01 |
| N-4 | **Switch off the test chata's public calendar** in Settings ("Vypnout veřejný kalendář", live since T-032), then prompt `10` again. On 18 Oct `Chata Alfa (test)` already read as switched off (the app hid the link for a member with the T-038 build); check the other test cottages | You | To do | |
| N-5 | **E-mail:** Lovable reported on 15 Oct that `notify.mychata.cz` failed verification. Check its DNS records in Lovable's e-mail settings and at the registrar. Then L-E (`05`), CC-3 (`06`) and L-3 (`07`) once G-1's Czech content is reviewed | You | To do | F-07 |
| N-6 | **Document search:** plan first (`08-CC-4-plan-document-search.md`). T-021 reads the manual's full text without embeddings, so re-check the T-007 and T-020 plans before anyone builds | Claude | To do | |
| N-8 | **Tag the release:** `release-2026-10-18` already exists on `9fce136` (T-036, set 17 Oct). Left: tag what is live now, `release-2026-10-18b` on `d52dfd0` (GitHub → Releases → Draft a new release; Claude's session can't push tags) | You | To do | |
| N-10 | **Check T-038 signed in:** published as `d52dfd0` (Knowledge rules 13–15 and prompt 21 done). Left: as Test 1 (Google, needs you), a member's held stay shows under "Pobyty ke schválení" on Home and Approve on the stay page confirms it; as Test 2 in `Chata Alfa (test)`, an overlapping booking says "Poslat ke schválení" and the held stay has "Stáhnout žádost". Also decide Test 1's pending guest request "Host Claude (test)" | You, then Claude | Doing | F-17, F-18, F-19 |
| N-11 | **Merge and publish T-039:** [PR #57](https://github.com/ranaji10/mychata/pull/57) (records after the T-038 publish, two small fixes, test updates). After merge: Lovable prompt 22 (`2026-10-18-lovable-prompt-22.md`, no migration), publish, `release.md` | You | To do | |
| N-9 | **Record the test accounts:** done in PR #48 for `docs/runbooks/test-cottages.md` as Test 1, 2, 3 (the repo is public; addresses in `private/test-accounts.md`). Left: add the same labels to Lovable's Knowledge | You | To do |  |

## Decisions waiting on you

Pick a Decision. "Ignore" rows are removed at the next update; "Focus later" rows stay until they become an N row; anything with a note, write the ID in chat or comment on the row.

**New 16 Oct:** D-18 to D-21 decide pricing. The strategy and its build steps (P-1 to P-13) are in Reference, section 10. **New 18 Oct:** D-22 to D-25.

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
| D-23 | Should an admin's own overlapping booking also wait, or stay confirmed (as built in T-036)? | With "No" to overlaps, admins can still double-book; the screen warns them | 18 Oct | |
| D-24 | Lovable's own platform updates (its build package, files under `src/integrations/`): accept them as they come, but ask that they arrive in a separate commit, never mixed into a migration or app round (as on 17 Oct)? | Mixed rounds make a broken publish harder to trace; the runbook now says how to handle them (two-person-workflow, "Lovable platform updates") | 18 Oct | |
| D-25 | Home's "Nevyrovnané" tile shows every open debt in the cottage (250 Kč), not what the viewer owes or is owed (100 Kč for Test 3). Keep the cottage total, or show "you owe / you are owed"? | Members aged 45–68 may read it as their own debt | 18 Oct | |

## Open defects

| ID | Defect | Why still open | Next | Status |
| --- | --- | --- | --- | --- |
| F-01 | Not yet tested live: iPhone clipboard, Document Vault "Open" on an iPhone, avatar upload on iOS. Passed 17 Oct: family and institution onboarding, a plain member not seeing someone else's "Cancel stay". Passed 18 Oct: demoted member's view, debtor's side of Settle debts, a member's pending stay with admin names, empty Expenses page | Needs an iPhone | N-3 | Waiting |
| F-03 | Cookie banner on phones covers all the sign-in options until dismissed (seen in Czechia, 14 Oct) | Deferred by decision. PR #42 only removes the 12px gap under it | Next design round | Waiting |
| F-04 | Guest and invitation pages are always green, even for an institution's cottage | Their data has no institution flag; needs a server change | With the next public-page task | To do |
| F-05 | B-004: Google sign-in fails on Brave | In Lovable's sign-in broker; e-mail sign-up works | Ask Lovable about your own Google credentials | To do |
| F-06 | Missing security headers (Content-Security-Policy, X-Frame-Options) | Lovable hosting sets them | Ask Lovable; otherwise Model B (O-08) | To do |
| F-07 | "Confirm email" for password sign-ups not verified | Someone could claim a relative's seat by e-mail match | L-E turns it on (N-5) | Waiting |
| F-08 | iPhone photos (HEIC) can't be converted in Chrome or Firefox | The app explains how to switch to JPG; Safari works | Optional: a HEIC converter in the browser | To do |
| F-09 | B-005: slow CORS / HTTP/3 errors on Supabase hosting (Firefox) | Three other B-005 items fixed in PR #21 | Watch; T-002 | Waiting |
| F-12 | Site check 4: hero photo downloaded twice | Not reproduced on 15 Oct (one request per load on `/`, `/auth`, `/verejne/zadost/x`) | Recheck in the next site check | Waiting |
| F-17 | Low items from 17 Oct: "expires in 6 days" right after making a 7-day link (reproduced 18 Oct); wrong-account notice on an invitation is green; page titles in the wrong language (live: English titles on the Czech app); Home shows "Next stay" twice; "Check Out" offered on a stay 9 days away; pre-0026 invitation batches can't be cancelled. ("Members and Requests lack a main landmark" no longer applies: every page has one main, checked 18 Oct) | Fixed in T-038, live since `d52dfd0`; signed-in check open | N-10 | Waiting |
| F-18 | Family admins cannot approve or decline a member's held stay (T-036 hold): the stay page showed Approve/Decline only for institutions and Approvals redirects families. The member can't withdraw it either. Database allows both (new test) | Fixed in T-038 (stay page, Home card, "Stáhnout žádost", "Poslat ke schválení"), live since `d52dfd0`; family side unverified until the Test 1 checks | N-10 | Waiting |
| F-19 | Found 18 Oct: a member's "Veřejný odkaz na kalendář" fails with 403 (Settings, Calendar); manual categories as raw codes ("RULES", "wifi"); dates by UTC day (expense after midnight, public calendar's free weekend a day early, invitation and export dates); "1 žádostí bude zamítnuto"; service worker caches server-function answers forever; 404 title; HTTP 406 after removing a stay | Fixed in T-038, live since `d52dfd0`; signed-in check open | N-10 | Waiting |

## How to use this doc

- **Status and Decision:** set the dropdowns yourself. Claude needs nothing for that.
- **A few inputs at once:** one chat message with IDs, e.g. "N-2 done, test address is …; D-04 Rajat; D-09 never". Cheapest for Claude: it finds only those rows.
- **A question about one row, or a record you want kept:** comment on the row. Send it to Claude, or leave it and say "process comments" later.
- **Tabs:** Now is the only tab you need day to day. Backlog holds open work that isn't next. Reference holds the 25 Sep review (ecosystem, billing, market, build system, RAG). Done & history holds everything finished, oldest first.
- **Rules Claude keeps:** IDs never change or get reused; a finished row moves to Done & history; this tab stays short. Repo copy of this tab: `docs/external/claude/2026-09-25-critical-review.md`; other tabs: same name plus `.backlog`, `.reference`, `.history`.

---

Source file: `docs/external/claude/2026-09-25-critical-review.md` in the mychata repo.

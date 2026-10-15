---
source: claude
model: claude-opus-5-5
date: 2026-09-25
updated: 2026-10-15
status: reviewed
artifact: https://claude.ai/code/artifact/de927c20-385c-481b-946a-49c085e87bf1
tab: Now
---

> Copy of the "Now" tab of the Claude doc "MyChata: tracker and critical review". The doc is the working copy; Claude refreshes this file whenever it edits that tab. Agents: this file is the only one you need to start; open the other tabs' copies (`.backlog.md`, `.reference.md`, `.history.md`) only when an ID or task points there.

# MyChata tracker

15 Oct 2026 · Tuik

**Live:** `c099891` (T-033), published 15 Oct 00:46. **Waiting on you:** merge PR #42 once CI is green, the institutional test account, and the two-person checks. Every row has an ID: **N** next step, **D** decision, **F** defect, **O** backlog.

## Next up

| ID | Step | Owner | Status | Unblocks |
| --- | --- | --- | --- | --- |
| N-1 | **Merge PR #42 (T-034)** once CI is green, publish, run prompt `10`. Cookie banner flush with the phone's bottom edge, an 800px photo for phones (about 180 KB instead of 380 KB), a heading on an invalid request link | You | To do | F-03, F-11, F-13 |
| N-2 | **Institutional test account:** a test e-mail on a work-style domain plus an institutional test property, added to `docs/runbooks/test-cottages.md` and Lovable's Knowledge | You | To do | N-3, F-02 |
| N-3 | **Two-person checks:** `prompts/2026-10-13/12-release-two-person-checks.md` (about 15 min, with Rajat or your second e-mail) plus the five onboarding steps for a family and an institution sign-up. Record results in STATUS.md, then tag the live commit (`release-2026-10-14` sits on the older `9f801e8`) | You, Rajat | To do | F-01, F-10 |
| N-4 | **Switch off the test chata's public calendar** in Settings ("Vypnout veřejný kalendář", live since T-032), then prompt `10` again | You | To do | |
| N-5 | **E-mail:** Lovable reported on 15 Oct that `notify.mychata.cz` failed verification. Check its DNS records in Lovable's e-mail settings and at the registrar. Then L-E (`05`), CC-3 (`06`) and L-3 (`07`) once G-1's Czech content is reviewed | You | To do | F-07 |
| N-6 | **Document search:** plan first (`08-CC-4-plan-document-search.md`). T-021 reads the manual's full text without embeddings, so re-check the T-007 and T-020 plans before anyone builds | Claude | To do | |

## Decisions waiting on you

Pick a Decision (Focus later, Open, Ignore, Done). "Ignore" rows are removed at the next update; "Focus later" rows stay until they become an N row; anything with a note, write the ID in chat or comment on the row.

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

## Open defects

| ID | Defect | Why still open | Next | Status |
| --- | --- | --- | --- | --- |
| F-01 | Not yet tested live: the demoted member's own view, the debtor's side of Settle debts, a member's pending stay with admin names, a new sign-up's onboarding (family and institution), the empty Expenses page, iPhone clipboard, a plain member not seeing "Delete task" or someone else's "Cancel stay", Document Vault "Open" on an iPhone | Needs a second person, a fresh account or an iPhone | N-3 | Waiting |
| F-02 | L-5c states never opened in a browser: guest, invitation, public manual, institution request, error and success states; the cookie banner on `/pozvanka` and public pages; blue screens with real data | No institutional test account | N-2, N-3 | Waiting |
| F-03 | Cookie banner on phones covers all the sign-in options until dismissed (seen in Czechia, 14 Oct) | Deferred by decision. PR #42 only removes the 12px gap under it | Next design round | Waiting |
| F-04 | Guest and invitation pages are always green, even for an institution's cottage | Their data has no institution flag; needs a server change | With the next public-page task | To do |
| F-05 | B-004: Google sign-in fails on Brave | In Lovable's sign-in broker; e-mail sign-up works | Ask Lovable about your own Google credentials | To do |
| F-06 | Missing security headers (Content-Security-Policy, X-Frame-Options) | Lovable hosting sets them | Ask Lovable; otherwise Model B (O-08) | To do |
| F-07 | "Confirm email" for password sign-ups not verified | Someone could claim a relative's seat by e-mail match | L-E turns it on (N-5) | Waiting |
| F-08 | iPhone photos (HEIC) can't be converted in Chrome or Firefox | The app explains how to switch to JPG; Safari works | Optional: a HEIC converter in the browser | To do |
| F-09 | B-005: slow CORS / HTTP/3 errors on Supabase hosting (Firefox) | Three other B-005 items fixed in PR #21 | Watch; T-002 | Waiting |
| F-10 | B-008: profile phone empty after save and reload | Root cause never confirmed; not retested since 13 Oct | In N-3: save a phone, reload | Waiting |
| F-11 | Seasonal hero photo is 380 KB on a 375px phone | 800px copy (about 180 KB) in PR #42 | Check after N-1 | Doing |
| F-12 | Site check 4: hero photo downloaded twice | Not reproduced on 15 Oct (one request per load on `/`, `/auth`, `/verejne/zadost/x`) | Recheck in the next site check | Waiting |
| F-13 | `/verejne/zadost/<invalid>` has no heading | Fixed in PR #42 | Check after N-1 | Doing |

## How to use this doc

- **Status and Decision:** set the dropdowns yourself. Claude needs nothing for that.
- **A few inputs at once:** one chat message with IDs, e.g. "N-2 done, test address is …; D-04 Rajat; D-09 never". Cheapest for Claude: it finds only those rows.
- **A question about one row, or a record you want kept:** comment on the row. Send it to Claude, or leave it and say "process comments" later.
- **Tabs:** Now is the only tab you need day to day. Backlog holds open work that isn't next. Reference holds the 25 Sep review (ecosystem, billing, market, build system, RAG). Done & history holds everything finished, oldest first.
- **Rules Claude keeps:** IDs never change or get reused; a finished row moves to Done & history; this tab stays short. Repo copy of this tab: `docs/external/claude/2026-09-25-critical-review.md`; other tabs: same name plus `.backlog`, `.reference`, `.history`.

---

Source file: `docs/external/claude/2026-09-25-critical-review.md` in the mychata repo.

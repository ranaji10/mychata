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

**Live:** build of 25 Oct 11:06 UTC = `lovable-sync` `2ffa813`: T-045 (PR #72) with migration 0036 applied via Lovable's marker 0037. Site check passed (`2026-10-25-site-check-2.md`); its build-sha meta reads "unknown" this time. **Waiting on you:** merge PR #73 (Lovable's marker and types) and PR #74 (reports), then tag (N-8); the visitor sign-up test (N-14); pricing D-18 to D-21. Every row has an ID: **N** next step, **D** decision, **F** defect, **O** backlog.

## Next up

| ID | Step | Owner | Status | Unblocks |
| --- | --- | --- | --- | --- |
| N-14 | **Finish the T-043 checks** (live since `06d9db3`; site check 25 Oct passed: headers, tab order, privacy numbers, request form answers correctly). Left for you: in `Testovací chata (Lovable)` open the public calendar signed out (private window) → "Požádat o termín" → sign up with a fresh e-mail → confirm → back on the calendar → send; approve as admin; check "Schválil(a)" on the stay and "Vaše žádosti" (once with the confirmation link opened in another browser: F-24); the cookie banner on a phone. Left for Claude: star the key events in GA once `sign_up` etc. appear | You, then Claude | Doing | F-24 |
| N-15 | **Review the Czech content draft** (G-1, written by Claude): `docs/external/claude/2026-10-25-g1-content-draft.md`. Correct it; a PR then adds `docs/content/` for L-3 | You | To do | N-5 |
| N-16 | **Approve or reject ADR-0012** (PR #67, document search re-plan): full-text answers up to 150,000 characters per cottage, stop the unused embeddings on save, T-007 on hold. Yes → Claude stops the embeddings | You | To do |  |
| N-10 | **Remaining T-042 checks** (passwords on the live site are yours to type): as Test 3, answer the auto-approval prompt in Members & permissions; as Test 2 in `Institutní chata (test)` a booking is confirmed at once and shows in Test 3's Notifications; as Test 1, rename `Chata Alfa (test)`; password change via the reset link (Test 2). Seen 25 Oct as Lovable's test user: the rename prompt shows for `Testovací chata (Lovable)` | You | To do |  |
| N-3 | **Remaining iPhone checks** on a real iPhone: clipboard, Document Vault "Open", avatar upload. All pass in Chromium's iPhone emulation (18 Oct) | You, Rajat | To do | F-01 |
| N-4 | **Public calendars of the test cottages:** `Testovací chata (Lovable)` is on (25 Oct). Leave it on for N-14's request test, then switch it off (Settings → "Vypnout veřejný kalendář") and check the other test cottages | You | To do |  |
| N-5 | **E-mail:** `notify.mychata.cz` failed verification (15 Oct). Check its DNS records in Lovable's e-mail settings and at the registrar. Then L-E (`05`), CC-3 (`06`) and L-3 (`07`, after N-15). Also turns on "Confirm email" (F-07, F-23) | You | To do | F-07, F-23 |
| N-8 | **Tag the release:** after PR #73 is merged, tag `release-2026-10-25` on its merge commit (live: T-045 with 0036). Claude can try pushing the tag now that the session has push access; else GitHub → Releases → Draft a new release | You | To do | |
| N-9 | **Test account labels in Lovable's Knowledge:** Test 1, 2, 3 as in `docs/runbooks/test-cottages.md` | You | To do |  |
| N-20 | Live privacy numbers (D-28 yes): read-only service account as GA4 Viewer, `GA_PROPERTY_ID` and `GA_SERVICE_ACCOUNT_JSON` as hosting secrets (`docs/runbooks/analytics.md`). Until then the snapshot | You | Waiting | After N-18 |
| N-22 | 0036 is live; owners, Members owner pill, Leave card, Home debts tile and Settle debts checked 25 Oct. Left, with test sign-ins: founders see My profile → Typ účtu and Members → Vlastník; an organisation member has no Requests tab; approving a public-calendar request offers an invitation; Home debts tile | Claude, you | Waiting | After N-18 |

## Decisions waiting on you

Pick a Decision. "Ignore" rows are removed at the next update; "Focus later" rows stay until they become an N row; anything with a note, write the ID in chat or comment on the row.

**D-18 to D-21 decide pricing (Reference, section 10).** Everything decided on 25 Oct was acted on (T-045) and moved to Done & history; what still needs a click became N-19 to N-21.

| ID | Question | Why it matters | Raised | Decision |
| --- | --- | --- | --- | --- |
| D-06 | Should institutions get their own logo or name in the header, not only blue? | Institutions may expect their own branding before they pay | 14 Oct | |
| D-18 | Adopt pricing v2 (Reference, section 10)? Families stay free; institutions pay first (9,900 Kč per object a year); Rodina Plus at 1,490 Kč a year once the rental toolkit ships | Replaces Gemini's draft and the 25 Sep table. Unlocks P-1 and P-10 and sets what the O-12 interviews test | 16 Oct | |
| D-19 | Founding offer: Rodina Plus at 990 Kč a year, locked for 3 years, for the first 100 accounts? | Gemini's "forever" price can never be raised; a 3-year lock can. Sets P-4 | 16 Oct | |
| D-20 | Institution pilots: free until 30 Sep 2027 for the first 3, in return for a named contact, monthly feedback and list price afterwards? | Sets P-3's backfill and what existing institutional accounts (D-08) are told | 16 Oct | |
| D-21 | Who sells: you, Rajat, or a company you both own (O-11)? | No invoice, terms or payment account without a seller; it also decides VAT status and the business split | 16 Oct | |

## Open defects

| ID | Defect | Why still open | Next | Status |
| --- | --- | --- | --- | --- |
| F-01 | Not yet tested on a real iPhone: clipboard, Document Vault "Open", avatar upload | Needs an iPhone; all pass in Chromium's emulation | N-3 | Waiting |
| F-05 | B-004: Google sign-in fails on Brave | In Lovable's sign-in broker; e-mail sign-up works | Ask Lovable about your own Google credentials | To do |
| F-07 | "Confirm email" for password sign-ups not verified | Someone could claim a relative's seat by e-mail match; public-calendar requests rely on it too | L-E turns it on (N-5) | Waiting |
| F-08 | iPhone photos (HEIC) can't be converted in Chrome or Firefox | Converter built on the T-045 branch (heic-to, loads only for HEIC; checked in Chromium). Closes when live | N-18 | To do |
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

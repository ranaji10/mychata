---
source: claude
model: claude-opus-5-5
date: 2026-09-25
updated: 2026-10-26
status: reviewed
artifact: https://claude.ai/code/artifact/de927c20-385c-481b-946a-49c085e87bf1
tab: Now
---

> Copy of the "Now" tab of the Claude doc "MyChata: tracker and critical review". The doc is the working copy; Claude refreshes this file whenever it edits that tab. Agents: this file is the only one you need to start; open the other tabs' copies (`.backlog.md`, `.reference.md`, `.history.md`) only when an ID or task points there. Test sign-ins appear here as Test 1, 2, 3 (the repo is public).

# MyChata tracker

26 Oct 2026 · Tuik

**Live:** build of 25 Oct 11:06 UTC = `lovable-sync` `2ffa813` (T-045 with 0036), tagged `release-2026-10-25` on 26 Oct. **Waiting on you:** merge PR #75 (GA runbook) and PR #76 (T-046: Help & support, Enter submits, Back from Privacy, ADR-0012, content), then publish (N-24); the DNS records and `podpora@` inbox at Hostinger (N-5); D-31; pricing D-18 to D-21. Every row has an ID: **N** next step, **D** decision, **F** defect, **O** backlog.

## Next up

| ID | Step | Owner | Status | Unblocks |
| --- | --- | --- | --- | --- |
| N-24 | **Merge PR #75 and PR #76, publish, check:** after `lovable-sync` catches up, publish in Lovable; Claude runs the site check (prompt `10`), checks `/pomoc` and Enter on sign-in signed in, and tags `release-2026-10-26` as a GitHub release. Lovable labels recent GitHub pushes "Build unsuccessful" (F-26): if the publish fails, tell Claude | You, then Claude | To do | F-25, F-27 |
| N-5 | **E-mail DNS at Hostinger** (checked 26 Oct: `notify.mychata.cz` doesn't exist, `mychata.cz` has no MX): add TXT `_lovable-email` = the `lovable_email_verify=…` value and NS `notify` → `ns3.lovable.cloud`, `ns4.lovable.cloud` (exact rows in prompt `05`); add a forwarder for `podpora@mychata.cz`; then Lovable → More → Emails → Retry setup. Then `05` → `06` → `07` (all updated 26 Oct) | You | To do | F-07, F-23, F-24, F-27 |
| N-10 | **Remaining T-042 checks** (passwords are yours): as Test 3, answer the auto-approval prompt in Members & permissions; then as Test 2 in `Institutní chata (test)` a booking is confirmed at once and shows in Test 3's Notifications (Test 2 still has a pending stay 23 Oct–1 Nov there); password change via the reset link (Test 2). Test 1's rename done 26 Oct (`Rodina Alfa (test)`) | You | To do |  |
| N-4 | **Public calendars of the test cottages:** Alfa switched off 26 Oct after the request test; Beta and Gama are off. `Testovací chata (Lovable)` is still on: only Lovable's test user can switch it off (one line in the next Lovable prompt) | You, Lovable | Waiting |  |
| N-3 | **Remaining iPhone checks** on a real iPhone: clipboard, Document Vault "Open", avatar upload, a HEIC photo in Firefox (F-08's converter is live since 25 Oct). All pass in Chromium's iPhone emulation | You, Rajat | To do | F-01 |
| N-20 | **Live privacy numbers** (D-28 yes): create a read-only Google Cloud service account, add it as Viewer in GA4, put `GA_PROPERTY_ID` and `GA_SERVICE_ACCOUNT_JSON` in Lovable's secrets. Steps in `docs/runbooks/analytics.md`. Until then the page shows the snapshot | You | To do |  |
| N-23 | **GA key events still to star:** `sign_up`, `booking_request_sent`, `invitation_accepted` (`booking_created` starred 26 Oct). The scheduled GA task stars them once GA lists them (a day after the first one arrives with analytics consent) | Claude (scheduled) | Waiting |  |

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
| D-31 | Fix Google sign-in on Brave (F-05) with our own Google Cloud OAuth client (Lovable → Users → Google → "Your own credentials")? | Google's consent screen would then say MyChata, not Lovable, and Brave stops failing. Costs: a Google Cloud project with an OAuth consent screen (Google may review it), and a code change away from Lovable's broker (cloud-auth-js) that Claude would test first | 26 Oct | |

## Open defects

| ID | Defect | Why still open | Next | Status |
| --- | --- | --- | --- | --- |
| F-01 | Not yet tested on a real iPhone: clipboard, Document Vault "Open", avatar upload | Needs an iPhone; all pass in Chromium's emulation | N-3 | Waiting |
| F-05 | B-004: Google sign-in fails on Brave | In Lovable's sign-in broker. Lovable → More → Users → Settings → Google offers "Your own credentials" (a Google Cloud OAuth client) | D-31 | To do |
| F-07 | "Confirm email" for password sign-ups not verified | Someone could claim a relative's seat by e-mail match; public-calendar requests rely on it too | N-5, then prompt `05` | Waiting |
| F-09 | B-005: slow CORS / HTTP/3 errors on Supabase hosting (Firefox) | Three other B-005 items fixed in PR #21 | Watch; T-002 | Waiting |
| F-21 | Google Analytics tag diagnostics: "0 % consent rate" | Ad consent is always denied by design. 26 Oct: stream "receiving traffic", no warning in the stream details | Recheck tag diagnostics on 1 Nov | Waiting |
| F-23 | Public-calendar requests: the 20-a-day cottage limit can be used up by throwaway accounts while "Confirm email" is off (PR #66 review) | Low; depends on F-07 | N-5 | Waiting |
| F-24 | After sign-up, returning to the calendar when the confirmation link is opened in another browser is untested | The rest of the request flow passed 26 Oct (N-14); with "Confirm email" off there is no link to open yet | Prompt `05`, "After" step 2 | Waiting |
| F-25 | A new booking request shows on the admin's Home, and the decision on the requester's calendar, only after a reload or about a minute (offline-first cache, 60 s stale time) | Found in the 26 Oct two-person check; nothing is lost | A small code task: refetch those two lists on focus and every 30 s | To do |
| F-26 | Lovable shows "Build unsuccessful / Preview is out of date" on recent GitHub pushes, even docs-only ones | The 25 Oct publish of the same code worked, so it may be Lovable's preview only | Watch at the N-24 publish | Waiting |
| F-27 | `podpora@mychata.cz` can't receive mail (no MX on `mychata.cz`), but the new Help & support page and future e-mails use it | Found 26 Oct while checking N-5 | N-5 (forwarder) | Waiting |

## How to use this doc

- **Status and Decision:** set the dropdowns yourself. Claude needs nothing for that.
- **A few inputs at once:** one chat message with IDs, e.g. "N-2 done, test address is …; D-04 Rajat; D-09 never". Cheapest for Claude: it finds only those rows.
- **A question about one row, or a record you want kept:** comment on the row. Send it to Claude, or leave it and say "process comments" later.
- **Tabs:** Now is the only tab you need day to day. Backlog holds open work that isn't next. Reference holds the 25 Sep review (ecosystem, billing, market, build system, RAG). Done & history holds everything finished, oldest first.
- **Rules Claude keeps:** IDs never change or get reused; a finished row moves to Done & history; this tab stays short. Repo copy of this tab: `docs/external/claude/2026-09-25-critical-review.md`; other tabs: same name plus `.backlog`, `.reference`, `.history`.

---

Source file: `docs/external/claude/2026-09-25-critical-review.md` in the mychata repo.

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

**Live:** `27f9992` (PR #78, T-048), published 26 Oct 19:28 UTC; English pages checked and the privacy page reads live GA numbers (N-20 done). **Waiting on you:** merge PR #79 (T-049: sign-in tokens no longer reach Google Analytics, one page view per page) and publish, plus the tags (N-26); D-33 (delete what GA already holds); D-32; the DNS records and `podpora@` inbox at Hostinger (N-5); D-31; pricing D-18 to D-21. Every row has an ID: **N** next step, **D** decision, **F** defect, **O** backlog.

## Next up

| ID | Step | Owner | Status | Unblocks |
| --- | --- | --- | --- | --- |
| N-26 | **Merge PR #79 and publish** (T-049: no tokens to Google Analytics, one page view per page, test-round fixes; no migration, no Lovable step), then Claude checks the requests to Google in the browser. Create the GitHub releases the cloud session may not: release-2026-10-26b on a4f45ea (PR #77), one on 27f9992 (PR #78, live and checked) and one for this publish. Test 2's stay 23 Oct–1 Nov in Institutní chata (test) still waits for Test 3's decision | You, then Claude | To do | F-30, F-31 |
| N-5 | **E-mail DNS at Hostinger** (checked 26 Oct: `notify.mychata.cz` doesn't exist, `mychata.cz` has no MX): add TXT `_lovable-email` = the `lovable_email_verify=…` value and NS `notify` → `ns3.lovable.cloud`, `ns4.lovable.cloud` (exact rows in prompt `05`); add a forwarder for `podpora@mychata.cz`; then Lovable → More → Emails → Retry setup. Then `05` → `06` → `07` (all updated 26 Oct) | You | To do | F-07, F-23, F-24, F-27 |
| N-3 | **Remaining iPhone checks** on a real iPhone: clipboard, Document Vault "Open", avatar upload, a HEIC photo in Firefox (F-08's converter is live since 25 Oct). All pass in Chromium's iPhone emulation | You, Rajat | To do | F-01 |
| N-23 | **GA key events still to star:** `sign_up`, `booking_request_sent`, `invitation_accepted` (`booking_created` starred 26 Oct). Checked 26 Oct evening: none has arrived yet, and GA can't star an event before it does. The scheduled task (27 Oct 09:47 UTC) stars them if they have; its text still says N-14 | Claude (scheduled) | Waiting |  |

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
| D-32 | Visible labels above every form field (and a line under a grey "Vytvořit účet" saying what is missing)? Claude writes the Lovable prompt or does it in code | Users are 45–68: a placeholder vanishes as soon as they type, so they can't check which field is which. Changes the look of every form a little (F-32) | 26 Oct | |
| D-33 | Delete what GA already holds from before PR #79: GA4 Admin → Data collection and modification → Data deletion requests → parameters page_location and page_referrer, from 27 Sep to the publish date? | Those values hold sign-in tokens from e-mail links and public-link tokens (F-30), readable by everyone with GA access. Cost: page reports before the publish lose their addresses (page titles stay). The tokens themselves: access tokens expire in an hour; refresh tokens rotate on use | 26 Oct | |

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
| F-27 | `podpora@mychata.cz` can't receive mail (no MX on `mychata.cz`), but the Help & support page and future e-mails use it | Found 26 Oct while checking N-5 | N-5 (forwarder) | Waiting |
| F-30 | Security: page views sent the whole address to Google Analytics, so sign-in tokens from e-mail links (#access_token=…&refresh_token=…) and public-link tokens reached Google | Found in the 26 Oct evening test round; fixed in PR #79; closes when live. Data already in GA: D-33 | N-26, D-33 | Doing |
| F-31 | Every page load sent two page views, so GA's page counts (and the privacy page's) were doubled | Fixed in PR #79; closes when live | N-26 | Doing |
| F-32 | About 35 fields have only a placeholder: the hint disappears once people type and screen readers have no name. "Vytvořit účet" stays grey without saying what is missing | PR #79 gives 22 public and setup fields an accessible name (no visual change); visible labels need D-32 | D-32 | To do |

## How to use this doc

- **Status and Decision:** set the dropdowns yourself. Claude needs nothing for that.
- **A few inputs at once:** one chat message with IDs, e.g. "N-2 done, test address is …; D-04 Rajat; D-09 never". Cheapest for Claude: it finds only those rows.
- **A question about one row, or a record you want kept:** comment on the row. Send it to Claude, or leave it and say "process comments" later.
- **Tabs:** Now is the only tab you need day to day. Backlog holds open work that isn't next. Reference holds the 25 Sep review (ecosystem, billing, market, build system, RAG). Done & history holds everything finished, oldest first.
- **Rules Claude keeps:** IDs never change or get reused; a finished row moves to Done & history; this tab stays short. Repo copy of this tab: `docs/external/claude/2026-09-25-critical-review.md`; other tabs: same name plus `.backlog`, `.reference`, `.history`.

---

Source file: `docs/external/claude/2026-09-25-critical-review.md` in the mychata repo.

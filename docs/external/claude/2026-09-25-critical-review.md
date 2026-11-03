---
source: claude
model: claude-opus-5-5
date: 2026-09-25
updated: 2026-11-03
status: reviewed
artifact: https://claude.ai/code/artifact/de927c20-385c-481b-946a-49c085e87bf1
tab: Now
---

> Copy of the "Now" tab of the Claude doc "MyChata: tracker and critical review". The doc is the working copy; Claude refreshes this file whenever it edits that tab. Agents: this file is the only one you need to start; open the other tabs' copies (`.backlog.md`, `.reference.md`, `.history.md`) only when an ID or task points there. Test sign-ins appear here as Test 1, 2, 3 (the repo is public).

# MyChata tracker

3 Nov 2026 · Tuik

**Live:** `4915d17` (PR #86: e-mail from `notify.mychata.cz`, Czech/English auth e-mails, "Confirm email" on), checked 3 Nov 02:40; before it `4bcba4b` (PRs #77–#84). DNS is at Cloudflare since 2 Nov; `podpora@` receives mail. **Waiting on you:** the e-mail tests with a real inbox (N-29); two releases, `release-2026-10-27` and `release-2026-11-03` (N-26); claim migration 0038 with Rajat so Claude can build CC-3 (N-30); delete the old page addresses in GA (N-27); in Brave, "Odhlásit se" on onboarding step 1; D-31; pricing D-18 to D-21. Every row has an ID: **N** next step, **D** decision, **F** defect, **O** backlog.

## Next up

| ID | Step | Owner | Status | Unblocks |
| --- | --- | --- | --- | --- |
| N-26 | **Create one GitHub release for the live publish** (decided 27 Oct: one release per checked publish; the three pending ones for #77–#79 are dropped). Releases → Draft a new release → tag `release-2026-10-27`, target `4bcba4b`, title "Analytics privacy, visible labels, no stuck or blank screens (PRs #77–#84)", notes from `docs/external/claude/2026-10-27-site-check.md` and `-site-check-2.md`. Then a second one: tag `release-2026-11-03`, target `4915d17`, title "E-mail from notify.mychata.cz (PR #86)", notes from `docs/external/claude/2026-11-03-site-check.md`. Cloud sessions are refused release creation. Test 2's stay 23 Oct–1 Nov in Institutní chata (test) still waits for Test 3's decision | You | To do |  |
| N-27 | **Delete the old page addresses in GA** (D-33: they persist 14 months and Rajat has Administrator access too): GA4 Admin → Data collection and modification → Data deletion requests → Schedule request → "Delete selected parameters across all events" → page_location and page_referrer, 27 Sep to 26 Oct → Submit. Runs after a 7-day grace period; can't be undone. Page reports before 26 Oct lose their addresses (titles stay) | You | To do | F-30 |
| N-3 | **Remaining iPhone checks** on a real iPhone: clipboard, Document Vault "Open", avatar upload, a HEIC photo in Firefox (F-08's converter is live since 25 Oct). All pass in Chromium's iPhone emulation | You, Rajat | To do | F-01 |
| N-23 | **GA key events still to star:** `sign_up`, `booking_request_sent`, `invitation_accepted` (`booking_created` starred 26 Oct). Checked again 3 Nov 02:35 in GA (Recent events, 28 days): still none of the three has arrived; key events are booking_created and onboarding_completed. You run the test round (steps sent in chat 26 Oct: one new address signs up from the test public calendar, sends a request, then accepts an invitation; Chrome, analytics allowed), then star them, or add them by name under Admin → Key events → New key event. The scheduled task (27 Oct 09:47 UTC) also checks; its text still says N-14 (Claude couldn't edit it) | Claude (scheduled) | Waiting |  |
| N-29 | **E-mail tests with a real inbox** (prompt 05, "After"; sending works: Lovable's log shows one auth e-mail delivered 3 Nov): 1) sign up with a fresh non-Gmail address you own: the mail comes from MyChata <no-reply@notify.mychata.cz> in Czech, and the account can't sign in before confirming (F-07); 2) public calendar of a test cottage → "Požádat o termín" → sign up → open the confirmation link in another browser (F-24); 3) "Zapomenuté heslo" for a test account: the reset mail arrives and opens "Nové heslo"; 4) send one mail to podpora@mychata.cz and reply from Gmail as podpora@ (check it isn't in spam). Tell Claude the results | You | To do | F-07, F-23, F-24 |
| N-30 | **CC-3 notifications by e-mail is unblocked** (prompt 06, waited for L-E, which is live). It needs migration 0038: claim it in your chat with Rajat (rule: one open migration PR at a time), then say "build CC-3". Claude builds it in a cloud session as T-053 with a fresh review; it must build e-mail links itself from https://mychata.cz (PR #86 review). After it: prompt 07 (Lovable) | You, then Claude | To do | Prompt 07 |

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
| F-07 | "Confirm email" for password sign-ups not verified | Someone could claim a relative's seat by e-mail match; public-calendar requests rely on it too | N-29, prompt `05` | Waiting |
| F-09 | B-005: slow CORS / HTTP/3 errors on Supabase hosting (Firefox) | Three other B-005 items fixed in PR #21 | Watch; T-002 | Waiting |
| F-21 | Google Analytics tag diagnostics: "0 % consent rate" | Ad consent is always denied by design. 3 Nov: Consent settings now say "Urgent: 0% consent rate" and "analytics consent signals inactive"; the code sends analytics_storage from the banner choice, so this is the ad signals plus low traffic. Stream receiving traffic | Watch; recheck when weekly users pass ~50 | Waiting |
| F-23 | Public-calendar requests: the 20-a-day cottage limit can be used up by throwaway accounts while "Confirm email" is off (PR #66 review) | Low; closes with F-07 (confirmation is on since 3 Nov) | N-29 | Waiting |
| F-24 | After sign-up, returning to the calendar when the confirmation link is opened in another browser is untested | The rest of the request flow passed 26 Oct (N-14); with "Confirm email" off there is no link to open yet | Prompt `05`, "After" step 2 | Waiting |

## How to use this doc

- **Status and Decision:** set the dropdowns yourself. Claude needs nothing for that.
- **A few inputs at once:** one chat message with IDs, e.g. "N-2 done, test address is …; D-04 Rajat; D-09 never". Cheapest for Claude: it finds only those rows.
- **A question about one row, or a record you want kept:** comment on the row. Send it to Claude, or leave it and say "process comments" later.
- **Tabs:** Now is the only tab you need day to day. Backlog holds open work that isn't next. Reference holds the 25 Sep review (ecosystem, billing, market, build system, RAG). Done & history holds everything finished, oldest first.
- **Rules Claude keeps:** IDs never change or get reused; a finished row moves to Done & history; this tab stays short. Repo copy of this tab: `docs/external/claude/2026-09-25-critical-review.md`; other tabs: same name plus `.backlog`, `.reference`, `.history`.

---

Source file: `docs/external/claude/2026-09-25-critical-review.md` in the mychata repo.

---
source: claude
model: claude-opus-5-5
date: 2026-09-25
updated: 2026-11-06
status: reviewed
artifact: https://claude.ai/code/artifact/de927c20-385c-481b-946a-49c085e87bf1
tab: Now
---

> Copy of the "Now" tab of the Claude doc "MyChata: tracker and critical review". The doc is the working copy; Claude refreshes this file whenever it edits that tab. Agents: this file is the only one you need to start; open the other tabs' copies (`.backlog.md`, `.reference.md`, `.history.md`) only when an ID or task points there. Test sign-ins appear here as Test 1, 2, 3 (the repo is public).

# MyChata tracker

6 Nov 2026 · Tuik

**Live:** `548f382` (PR #112 T-066; build-sha checked 6 Nov 17:35). Rechecked 6 Nov evening: O-32 passes on Test 5's guest link ("jan@seznam" → "Please check the email address.", nothing sent; name 120 / e-mail 200 / note 1000 limits; House manual box 500), and a valid guest request was sent and declined, so no test data is left (`docs/external/claude/2026-11-06-site-check-2.md`). GitHub's "Allow GitHub Actions to create and approve pull requests" and Dependabot security updates were already on; Gmail already replies from podpora@. **In review:** PR #113 (T-067: O-30 day visits in the overlap rule with migration 0048, O-20 no endless loading, Google sign-ups counted in GA), CI green, fresh review done. **Waiting on you:** merge PR #113, then prompt 31 to Lovable (N-41); prompt 32 for Lovable's temporary cottage (N-33); N-29 steps 1–2; in Brave, "Odhlásit se" on onboarding step 1; D-31; pricing D-18 to D-21. Deferred by you: approving each cottage for family (3 Nov), past stays by admins O-25 (5 Nov). Every row has an ID: **N** next step, **D** decision, **F** defect, **O** backlog.

## Next up

| ID | Step | Owner | Status | Unblocks |
| --- | --- | --- | --- | --- |
| N-3 | **Remaining iPhone checks** on a real iPhone: clipboard, Document Vault "Open", avatar upload, a HEIC photo in Firefox (F-08's converter is live since 25 Oct). All pass in Chromium's iPhone emulation | You, Rajat | To do | F-01 |
| N-23 | **GA key event still to star: `sign_up`.** `booking_request_sent` and `invitation_accepted` arrived and were starred 6 Nov (with `booking_created` and `onboarding_completed`). `sign_up` never arrived because Google sign-ups never sent it (only email did); PR #113 fixes that. GA's new Events screen has no "add by name", so star `sign_up` under Admin → Events → Recent events once it shows, after the next Google sign-up with analytics allowed. The scheduled task also checks | Claude (scheduled) | Waiting |  |
| N-29 | **E-mail tests with a real inbox, steps 1–2 left** (3 and 4 passed 3 Nov: reset mails arrive from MyChata in the account's language and open "Nové heslo"; a mail to podpora@ reached Gmail and the reply as "MyChata podpora" arrived, not in spam). 1) a fresh non-Gmail sign-up got its confirmation in English (your test, 5 Nov). Still to note: the mail comes from MyChata <no-reply@notify.mychata.cz> in the language you chose, and the account can't sign in before confirming (F-07); 2) public calendar of a test cottage → "Požádat o termín" → sign up → open the confirmation link in another browser (F-24). Tell Claude the results | You | To do | F-07, F-23, F-24 |
| N-33 | **Lovable left "Lovable dočasná chata (test)" on production** during its 0040 work. It can't be removed from the app: there is no "delete cottage" action and no delete permission on cottages, and it sits in Lovable's own account. Send prompt `32-L-delete-temp-cottage.md` (prompts/2026-11-06): Lovable checks it is empty and in its own account, then deletes that one row | You | To do | |
| N-41 | Merge PR #113 (T-067: O-30, O-20, Google sign-ups in GA; CI green, review fixed). When lovable-sync has it, send prompt 31-L-apply-migration-0048.md, merge Lovable's lovable-sync PR into main at once, publish, tell Claude "published" for the recheck | You | To do | O-20, O-30, N-23 |

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

---
source: claude
model: claude-opus-5-5
date: 2026-09-25
updated: 2026-11-09
status: reviewed
artifact: https://claude.ai/code/artifact/de927c20-385c-481b-946a-49c085e87bf1
tab: Now
---

> Copy of the "Now" tab of the Claude doc "MyChata: tracker and critical review". The doc is the working copy; Claude refreshes this file whenever it edits that tab. Agents: this file is the only one you need to start; open the other tabs' copies (`.backlog.md`, `.reference.md`, `.history.md`) only when an ID or task points there. Test sign-ins appear here as Test 1, 2, 3 (the repo is public).

# MyChata tracker

9 Nov 2026 · Tuik

**Live:** `cc8212e` (PRs #116 and #117 published 9 Nov 19:18; main since then is docs only). Unit, database, lint, typecheck and build all pass on the new versions. **Next:** merge T-069 (F-34), Lovable applies migration 0050, publish; then N-42. **Waiting on you:** D-34; in Brave, "Odhlásit se" on onboarding step 1; D-31; pricing D-18 to D-21. Watch the 10 Nov nightly check: first run on Playwright 1.65. Deferred by you: approving each cottage for family (3 Nov), past stays by admins O-25 (5 Nov). Every row has an ID: **N** next step, **D** decision, **F** defect, **O** backlog.

## Next up

| ID | Step | Owner | Status | Unblocks |
| --- | --- | --- | --- | --- |
| N-42 | **After T-069 is published** (Lovable applies 0050 first): Claude checks Test 3's calendar link says "switched off" and its request form works; as Test 5, a public request shows in violet on Requests, Home links there, Notifications opens Requests; Test 5's calendar still works | Claude | To do | F-34 | Institution cottages: a public calendar left on could not be seen or switched off by the admin; its requests were missing from the "Pending requests" tile (showed 0) and from Requests | Fixed in T-069 as decided 9 Nov: public calendar for families only (migration 0050), every booking request on Requests with public ones in violet (ADR-0014). Not yet merged | N-42 | Fix ready |
| N-3 | **Remaining iPhone checks** on a real iPhone: clipboard, Document Vault "Open", avatar upload, a HEIC photo in Firefox (F-08's converter is live since 25 Oct). All pass in Chromium's iPhone emulation | You, Rajat | To do | F-01 |

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
| D-34 | Ask visitors for advertising consent, or accept GA's "0 % consent rate" warning (F-21)? | Recommended: accept. MyChata runs no Google Ads; the warning only affects ad measurement and remarketing. Asking would add a second banner choice for 45–68-year-olds for no feature | 9 Nov | |
| D-31 | Fix Google sign-in on Brave (F-05) with our own Google Cloud OAuth client (Lovable → Users → Google → "Your own credentials")? | Google's consent screen would then say MyChata, not Lovable, and Brave stops failing. Costs: a Google Cloud project with an OAuth consent screen (Google may review it), and a code change away from Lovable's broker (cloud-auth-js) that Claude would test first | 26 Oct | |

## Open defects

| ID | Defect | Why still open | Next | Status |
| --- | --- | --- | --- | --- |
| F-01 | Not yet tested on a real iPhone: clipboard, Document Vault "Open", avatar upload | Needs an iPhone; all pass in Chromium's emulation | N-3 | Waiting |
| F-05 | B-004: Google sign-in fails on Brave | In Lovable's sign-in broker. Lovable → More → Users → Settings → Google offers "Your own credentials" (a Google Cloud OAuth client) | D-31 | To do |
| F-34 | Institution cottages: a public calendar left on could not be seen or switched off by the admin; its requests were missing from the "Pending requests" tile (showed 0) and from Requests | Fixed in T-069 as decided 9 Nov: public calendar for families only (migration 0050), every booking request on Requests with public ones in violet (ADR-0014). Not yet merged | N-42 | Fix ready |
| F-21 | Google Analytics: "Urgent: 0% consent rate" and "analytics consent signals inactive" | Diagnosed 9 Nov: not a code defect. The live tag sets the EEA defaults before any hit and the banner's update arrives: a consenting visitor's page_view carries `gcs=G101` (analytics granted, ads denied). The 0 % is the ad signals, which MyChata never asks for, so every visitor is "denied" by design. Only asking for ad consent would change it (D-34) | D-34 | Waiting |

## How to use this doc

- **Status and Decision:** set the dropdowns yourself. Claude needs nothing for that.
- **A few inputs at once:** one chat message with IDs, e.g. "N-2 done, test address is …; D-04 Rajat; D-09 never". Cheapest for Claude: it finds only those rows.
- **A question about one row, or a record you want kept:** comment on the row. Send it to Claude, or leave it and say "process comments" later.
- **Tabs:** Now is the only tab you need day to day. Backlog holds open work that isn't next. Reference holds the 25 Sep review (ecosystem, billing, market, build system, RAG). Done & history holds everything finished, oldest first.
- **Rules Claude keeps:** IDs never change or get reused; a finished row moves to Done & history; this tab stays short. Repo copy of this tab: `docs/external/claude/2026-09-25-critical-review.md`; other tabs: same name plus `.backlog`, `.reference`, `.history`.

---

Source file: `docs/external/claude/2026-09-25-critical-review.md` in the mychata repo.

---
source: claude
model: claude-opus-5-5
date: 2026-09-26
status: reviewed
artifact: https://claude.ai/code/artifact/7b07f9c1-14fd-4777-8538-cd684a70538e
input: private/Raw Agent Suggestions/26092026_Gemini_Feedback_mychata.cz.md (workspace, not in git)
---

> Copy of the Claude doc "MyChata: agent prompts from the 26 Sep review". The doc is the working copy; Claude refreshes this file whenever it edits the doc.

# MyChata: agent prompts from the 26 Sep review

The Gemini walkthrough found 5 real bugs and about 25 UX requests. Most of the "strangers in my cottage" findings are the demo family still in production, not a data leak. Send Claude Code's bug batch first. Hold Lovable's batches until the GitHub flow for two maintainers is in place.

## What the review actually found

Each item was checked against the code on main (commit d6494c3) before it was assigned.

**Not a leak: the demo family.** "Chata U Lípy", Petra Nováková, and the firewood and repair expenses are the demo data seeded on 8 Sep. Your account is linked to that demo family, so you see its members and costs. The fix is T-012 (remove demo data), not a new permissions feature.

**Real bugs (5)**

1. **Handover can't be saved half-done.** The save button stays disabled until every item is ticked (`predani.tsx`, `disabled={!allDone}`).
2. **Photo upload fails with no reason shown.** The error is caught and replaced with "Upload failed" (`fotky.tsx`), which breaks rule 6 ("nothing fails silently"). There is no size limit or compression, and "set as main photo" ignores the first update's error.
3. **Phone number doesn't reappear after saving.** The save call looks right, so the cause is on the reading side or in the database policy. It needs a reproduction.
4. **An expense you don't split shows "Settled".** Splits leave out the payer, so an expense only you paid has no one owing and reads as "Settled". It should say "Paid by you, not split".
5. **Seasonal checklists can be added twice.** Each tap adds the full template again, with no check for one already added.

**Works as designed but confusing (2)**

- The institution sign-up button stays grey because you signed in with a Gmail address. Institutions need a work email domain. The warning is there but easy to miss.
- "More" is `Více` in Czech. "Sea" came from Chrome's page translator, not the app. Renaming it to Settings (`Nastavení`) is still a good idea.

**Already exists, but hard to find (4)**

- The chata and account switcher is on the Profile page, not behind the chata name at the top.
- Member management is at More → Members (`/clenove`).
- Each task has a detail page (`/ukoly/$id`), but only the title text links to it, not the whole tile.
- The manual already defaults to members-only. Sections marked public are shared only through a token link.

## Who does what

The split follows the rules Lovable already has in its Knowledge. Lovable does screens and wording only. Anything that touches the database, sign-in, email or AI goes to Claude Code as a PR. Copilot writes tests. Gemini drafts Czech content for a person to review.

| Request from the review                                                                 | Owner                                            | Batch     |
| --------------------------------------------------------------------------------------- | ------------------------------------------------ | --------- |
| Remove the demo family and fake university                                              | You (T-012 script, irreversible)                 | Now       |
| Handover: save a partial checklist                                                      | Claude Code                                      | CC-1 bugs |
| Photo upload: show the real error, compress, size limit                                 | Claude Code                                      | CC-1 bugs |
| Phone number not shown after save                                                       | Claude Code                                      | CC-1 bugs |
| "Settled" label on unsplit expenses                                                     | Claude Code                                      | CC-1 bugs |
| Seasonal checklist: no duplicates, grouped as one checklist                             | Claude Code (schema) then Lovable (UI)           | CC-2, L-2 |
| Assignee list: only real members of this chata                                          | Claude Code (verify)                             | CC-1 bugs |
| Tap the chata name to switch chatas and accounts                                        | Lovable                                          | L-1       |
| "Add booking" button on Home                                                            | Lovable                                          | L-1       |
| Whole "Next stay" and task tiles tappable                                               | Lovable                                          | L-1       |
| Calendar: first tap = from, second tap = to                                             | Lovable                                          | L-1       |
| Book dates without filling every field                                                  | Claude Code (defaults) then Lovable              | CC-2, L-1 |
| Rename More to Settings; settings open in place, with a way back                        | Lovable                                          | L-1       |
| Stay awaiting approval: show the admin and a Message button                             | Lovable (UI) + Claude Code (notification)        | L-2, CC-3 |
| Task detail: notes, tag people, notify them                                             | Claude Code (schema, email) then Lovable         | CC-3, L-2 |
| Overdue task: prompt for a note                                                         | Lovable                                          | L-2       |
| Done tasks move to a collapsed Done section                                             | Lovable                                          | L-2       |
| New task defaults to me as assignee                                                     | Lovable                                          | L-2       |
| Checklist generator asks who to assign first                                            | Lovable                                          | L-2       |
| Adding a checklist keeps the scroll position                                            | Lovable                                          | L-2       |
| Expense detail with actions (remind, receipt, cover all)                                | Lovable (UI) + Claude Code ("cover all" rule)    | L-3, CC-2 |
| Handover sent to the next booking's guest, with confirmation                            | Claude Code (needs email, T-005) then Lovable    | CC-3, L-3 |
| Expandable handover history                                                             | Lovable                                          | L-3       |
| Add chata: one question, then a tile showing what's missing, with "why we ask" tooltips | Lovable                                          | L-3       |
| House rules: one-click template, editable                                               | Lovable (static templates) + Gemini (Czech text) | L-3, G-1  |
| Manual as question templates                                                            | Lovable (UI) + Gemini (question bank)            | L-3, G-1  |
| Institution sign-up: clearer work-email message, name suggestions                       | Lovable (message now); suggestions later         | L-3       |
| Invitations sent by email instead of copied                                             | Claude Code (T-005 email provider)               | CC-3      |
| Share guest link through the phone's share sheet                                        | Lovable                                          | L-1       |
| Document vault in the manual search                                                     | Claude Code (T-007 stage 2, not Pinecone)        | Later     |
| Phone number verification by SMS                                                        | You decide (cost, provider)                      | Hold      |
| Privacy page with live Google Analytics stats                                           | You decide (see last section)                    | Hold      |
| Tests for everything above                                                              | Copilot                                          | CP-1      |

## Claude Code prompts

Run these in Claude Code (or this workspace) with the mychata repo open. Each one ends as a PR you merge. Send them in order. CC-3 waits for the email setup (Lovable batch L-E and the DNS step in T-005).

### CC-1: bugs from the 26 Sep review

```
Read AGENTS.md, docs/STATUS.md and docs/product/design.md first.
Branch: agent/claude/T-017-review-bugs. One PR. Add docs/bugs/B-006 to B-010 using _TEMPLATE.md, one per bug.

Fix these five bugs found in a walkthrough of mychata.cz on 26 Sep. For each: write a failing test first where the code allows it, then fix, then keep the test.

1. Handover (src/routes/predani.tsx): the save button is disabled until every item is ticked. Allow saving with any number of items ticked. Store which items were done and which were skipped. Show "x of y done" in the handover history.
2. Photos (src/routes/fotky.tsx): the catch block hides the real error. Show a specific message for: file too large, wrong type (HEIC from iPhone), no permission (storage policy, see migration 0013), network. Resize images in the browser to max 2000 px and ~1 MB before upload. Check the error of the first update in makePrimary. The button must never stay disabled after a failure.
3. Profile phone (src/routes/profil.tsx): after saving a phone number and reloading, the field is empty. Reproduce it against the local test database with the profiles policies from 0011 and 0013, find whether the write or the read fails, fix it, and add a test.
4. Expenses (src/routes/vydaje.tsx): an expense with no one else in the split shows "Settled". Show "Paid by you, not split" (cs: "Zaplaceno vámi, nerozděleno") instead. "Settled" appears only when splits exist and all are paid back.
5. Assignee list (tasks, expenses): confirm it only lists members of the active account (current_account_id()). Add a security test with two accounts proving a member of B never appears in A's list.

Do not touch the demo data (that is T-012, a human decision).
Done when: bun run check passes (paste the output), each bug has a test or a written manual check, STATUS.md lists the fixes as "fixed on branch, not yet live".
```

### CC-2: data changes the new screens need

```
Read AGENTS.md and docs/architecture/tenancy-and-security.md first.
Branch: agent/claude/T-018-checklists-and-defaults. One migration (next free number; the CI migration guard checks it).

1. Checklists: add a checklists table (account_id, property_id, template_id, title, created_by, created_at) and tasks.checklist_id. Adding the same seasonal template twice in one season asks first instead of duplicating. Seasonal tasks can be assigned in bulk to one member at creation.
2. Booking defaults: a booking created from the calendar with only dates filled gets the current member as booker, the chata's default status (auto-confirmed for family accounts, pending for institutions), and no required note.
3. Expense "cover it all": the payer can mark all their splits as forgiven in one action. Record it in audit_log. Only the payer or an admin may do this; RLS test for both.
4. New task default: assignee_member_id defaults to the creator when not given.

Every new table: RLS, a pgTAP/Vitest security test, docs:gen. No UI work: Lovable builds the screens after this is merged.
```

### CC-3: notifications and email (after L-E is live)

```
Read docs/tasks/T-005-email.md. Email is sent through Lovable's built-in email (sender MyChata <no-reply@notify.mychata.cz>, replies to the support inbox), set up by Lovable in batch L-E. Build on the send function L-E created; don't add another provider.
Branch: agent/claude/T-005-notifications.

Build one notifications pipeline, not one per feature:
- Wrap Lovable's send call in src/lib/email.server.ts: sendEmail({to, template, data, lang}). Nothing else calls the provider, so moving off Lovable later (Model B) changes one file.
- notifications table (account_id, recipient_member_id, kind, payload jsonb, read_at, emailed_at, email_error), RLS: the recipient reads their own.
- The existing cron worker (cron-auth.ts) sends queued emails, retries failures three times, and records email_error.
- Kinds in this PR: invitation (email by default; keep copy-link as a fallback), booking_awaiting_approval (to the chata admins), task_tagged, handover_to_next_guest (to the member with the next confirmed booking; the confirmation names them and the dates).
- Czech first, English when the member's language is English. Rate limit per sender per day. No member phone numbers or emails shown in the UI; the Message button creates a notification.
Done when: tests cover RLS and the queue; one real email per kind reaches a maintainer's own address, never real members.
```

## Lovable prompts

Hold these until the ruleset and the Lovable bypass are set up (two-person runbook, step 2). Send one batch at a time and publish only after CI is green. L-1 needs nothing new from the database. L-2 and L-3 each wait for the Claude Code PR named in them.

### L-1: navigation and Home (can go first)

```
UI and wording only. Do not create or edit migrations, SQL, RLS, auth or server functions (src/lib/*.functions.ts); if something needs them, stop and tell me. Follow docs/product/design.md (coral/cream, Manrope, 16px text, 44px tap targets, light only, 420px shell) and write every text with t("česky", "English"), Czech first.

1. Chata switcher: tapping the chata name in the header opens a sheet listing every chata and account I belong to, with my role in each, using the existing switchAccount from src/lib/account.tsx. Include "Add a chata" at the bottom. Keep the Profile page switcher too.
2. Home: add a primary "Add booking" button (Přidat pobyt). Make the whole "Next stay" card tappable, not just the icon.
3. Calendar: first tap selects the start date, second tap the end date, with the range highlighted; a third tap starts over. "Book these dates" opens the booking form with the dates filled and only the fields that are required.
4. Tasks list: the whole task tile opens /ukoly/$id, not only the title.
5. Rename the bottom tab "Více / More" to "Nastavení / Settings" (route stays /vice). Sections inside Settings (Members, Add a chata, Photos, Documents) open as expanding panels or as pages with a visible back arrow to Settings. Nobody should need to tap the tab again to get back.
6. Guest link and public calendar link: use navigator.share() when available (phone share sheet: WhatsApp, Messages, AirDrop); fall back to copying with a toast. Never use alert().

When done, list every file changed and what I should click to check each item.
```

### L-2: tasks and approvals (after CC-2 is merged)

```
Same rules as before: UI only, design.md, t(cs, en). The database changes from PR "T-018 checklists and defaults" are live; use them, don't change them.

1. Adding a seasonal checklist: first ask "Assign all to" (me by default, or pick a member) and show which checklist it is. Add it as one collapsed group at the bottom. Keep the scroll position where it was. If the same checklist already exists this season, ask before adding.
2. Group tasks by checklist, with a collapsed "Done" section at the bottom holding completed tasks.
3. New task form: assignee preselected to me.
4. Overdue task: show a small prompt on the tile "Add a note about the delay" that opens the task detail with the note field focused.
5. Task detail (/ukoly/$id): notes field and a people picker listing members of this chata only. Show the tag chips. (Sending the notification comes later with email; for now show "Tagged, they'll see it in the app.")
6. Stay awaiting approval (/rezervace/$id): show who approves (the admin's name, no phone or email), what happens next, and a "Message the admin" button. Until email exists, the button can open a prefilled mailto: to the chata's shared contact if set, otherwise it's hidden.
```

### L-3: expenses, handover, onboarding (after CC-1 and CC-3 are merged)

```
Same rules: UI only, design.md, t(cs, en).

1. Expense detail: tapping an unsettled expense opens a detail sheet: who paid, the split per person, receipt photo (upload/view), and actions: "Remind" (sends the notification from CC-3), "Mark my share paid" (the person who owes), "Cover it all" (payer only, uses the CC-2 function, asks to confirm).
2. Handover: "Save and hand over" works with any number of items ticked. The confirmation reads: "Handover sent to {name}, staying {from}–{to}." If there is no next booking: "Saved. No upcoming stay yet." Handover history tiles expand in place to show done and skipped items and notes.
3. Add a chata: the first screen asks one question, "What's your chata called?" After that the chata appears as a tile with a "Details missing" badge. Each missing field (address, rooms, capacity, seasons) has a one-line "Why we ask" note saying exactly how it's used (for example: "Address: shown only to members and to guests you approve"). Nothing but the name is required.
4. House rules: a "Use a starter set" button fills an editable list of 8–10 basic family rules (text from docs/content/house-rules-cs-en.md, which a person will supply). Nothing is saved until the user taps Save.
5. Manual: show each empty section as a question with suggested answers to pick or edit (question bank in docs/content/manual-questions-cs-en.md). Members-only stays the default.
6. Institution sign-up: when a Gmail/Seznam address blocks the button, put the reason right under the button, not above the form: "Organizations sign up with a work email (e.g. @vase-skola.cz)."
```

### L-E: email setup (after the DNS step in T-005)

```
This is the one exception to "UI only": set up Lovable's built-in email for this project. Do not touch migrations, RLS or other server functions.

1. Sender domain mychata.cz with the subdomain notify.mychata.cz (already verified in Settings). From: "MyChata <no-reply@notify.mychata.cz>". Reply-To: podpora@mychata.cz.
2. Authentication emails (sign-up confirmation, password reset, magic link, email change, invite) in Czech with an English line underneath, using the look in docs/product/design.md. Make sure "Confirm email" is on for password sign-ups.
3. App emails: create one generic template "notification" (subject, heading, one paragraph, one button with a link) and the server-side send function for it. Don't send anything from the app yet; Claude Code connects it to the notifications queue (T-005).
4. Tell me the file and function name of the send function, and where delivery logs are shown.
```

## Copilot and Gemini prompts

Copilot's coding agent works from a GitHub issue: create the issue, assign it to Copilot, and it opens a PR. It already reads `.github/copilot-instructions.md`, which points to AGENTS.md. Give it tests and small, well-bounded changes, never migrations. Gemini drafts content only. Its output goes into the repo as a draft file that a person reviews.

### CP-1: tests (GitHub issue, assign to Copilot)

```
Title: Tests for rules the app enforces only in the UI (T-015) and untested database rules (T-016)

Read AGENTS.md, docs/tasks/T-015-tests-for-app-only-rules.md and docs/tasks/T-016-tests-for-untested-database-rules.md.
Write the tests those briefs list. Test files only: supabase/tests/ and src/**/*.test.ts(x). Do not change application code, migrations or CI. If a test fails because the app is wrong, mark it test.fails with a comment naming the rule, and list it in the PR description; do not fix it.
Branch: agent/copilot/T-015-T-016. Paste the output of bun run check in the PR.
```

### G-1: Czech content (Gemini, in Workspace)

```
You are drafting content for MyChata, a Czech app where families and institutions share a chata (summer cottage). Users are 45–68, mostly Czech. Plain words, friendly, no marketing tone. Write Czech first, then an English version of each line.

1. House rules starter set: 10 short rules for a family chata used by relatives who know each other (cleaning before leaving, taps and switches off, firewood, rubbish and recycling, keys, pets, quiet hours, heating in winter, water shut-off, leaving food). One sentence each.
2. Manual question bank: for each manual section (Arrival and keys, Water, Electricity and heating, Wi-Fi, Waste, Leaving the chata, Emergencies, Neighbours), 3–5 questions with 2–4 typical answers to pick from, plus "Other". Example: "Where is the main water valve?" → "In the cellar", "Under the sink", "In the garden shaft".
3. "Why we ask" notes: one line each for address, number of rooms, capacity, seasons in use, photos, phone number. Say exactly who can see it and what it's used for. Don't promise anything the app doesn't do.

Output Markdown with frontmatter: source: gemini, model, date, status: draft. No personal data about anyone.
```

Save Gemini's answer as `docs/external/gemini/2026-09-26-content.md` in a PR. After a person has reviewed it, it becomes `docs/content/house-rules-cs-en.md` and `docs/content/manual-questions-cs-en.md`, which L-3 refers to.

## Your decisions, and what not to paste

**Don't paste Gemini's "technical configuration files" into any agent.** They target a different app:

- Next.js API routes. MyChata runs on TanStack Start (ADR-0001).
- Pinecone plus OpenAI-style embeddings at 3,072 dimensions. A 3,072-vs-768 mismatch is exactly what broke the manual search (defect 2). The design keeps vectors in Supabase at 768 (ADR-0004).
- `alert()` popups and a Google Analytics private key in the app's environment.

**Don't paste Gemini's "persona" answer either.** When its data retrieval failed, it filled the prompt with details about you and your other projects. Lovable would have stored them in project memory. Gemini also said "I've added it to the file" several times; there was no file. The prompts above replace everything from that session.

**Where the AI calls happen (your question in the session).** The manual answers use Lovable's AI gateway (Gemini 2.5 Flash-Lite, embeddings with gemini-embedding-001). They're billed to whichever Lovable workspace holds the `LOVABLE_API_KEY`, which today is the Lovable workspace the project sits in. Since migration 0015 each user has a daily cap and there's an on/off switch (`ai_manual`). If the AI call fails, the search falls back to keywords and shows the best-matching manual excerpt instead of an AI answer. If nothing matches, it says so rather than guessing. Moving to Google directly in an EU region is an open decision in the critical review (section 7). Vertex AI isn't worth it yet, as Gemini also said.

| Decision                                        | Recommendation                                                                                     | Why                                                                                                                                                             |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Privacy page with live Google Analytics numbers | Not now. Rewrite it as plain-language, friendly and short, with a "what we collect and why" table. | GA only counts visitors who consent, and current numbers are tiny, so a counter would show a handful. It also needs a Google service-account key on the server. |
| Phone verification by SMS                       | Hold until a feature actually uses the phone number.                                               | Costs per SMS, needs a provider and GDPR terms, and protects nothing today.                                                                                     |
| Remove the demo family (T-012)                  | Yes, this week, before anyone else reviews the app.                                                | It's why the app looks like strangers can see your chata.                                                                                                       |
| Email provider (T-005)                          | Decided 26 Sep: Lovable's built-in email, from no-reply@notify.mychata.cz. Steps in T-005.         | Invitations, approvals, tagging and handovers all need it.                                                                                                      |

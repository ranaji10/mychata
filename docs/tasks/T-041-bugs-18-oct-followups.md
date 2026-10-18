# T-041 What T-040 left open of the bugs of 18 Oct 2026

Owner: Claude (cloud session) · Status: review

Goal: after the T-040 / migration 0030 publish (`7ab6f5e`), re-check every one of the 18 bugs in `private/Screenshots/Bugs/18102026_BugsList.rtf` (outside the repo) against the code and its screenshots, fix what is still open, and bring the records up to date.
Non-goals: anything needing a migration; emails or push for notifications; the cookie banner (F-03).
Files allowed: `src/routes/kalendar.tsx`, `src/routes/verejne.kalendar.$token.tsx`, `src/routes/vice.tsx`, `src/components/AppShell.tsx`, `src/components/AskBox.tsx`, `src/lib/account-label.ts`, `src/lib/manual-answers.ts`, `src/lib/manual-qa.functions.ts`, `src/lib/t041.test.ts`, `docs/STATUS.md`, `docs/tasks/T-040-bugs-18-oct.md`, `docs/external/claude/2026-09-25-critical-review*.md`, this file.
Invariants touched (AGENTS.md): 5 (new text through `t()`), 6.

## Re-check of the 18 bugs

- **Bug 1.** Fixed: no email above the cottage name.
- **Bug 2.** Fixed in the app; the public calendar's empty state still said "The cottage is still free". T-041: "still available".
- **Bug 3.** Fixed: `translate="no"` and `notranslate` confirmed live; dom guard and network retry in the bundle.
- **Bug 4–4c, 5.** Fixed: Tasks tab gone, Maintenance under Manage cottages, Settings sub-list, desktop sidebar, Notifications tab.
- **Bug 6.** Fixed: `SettingsRow` and a unit test against pill-shaped rows.
- **Bug 7.** Partly: the account/email line was removed, but the bug asked for the person's **name** at the top and a prompt when there is none. T-041: Name above the cottage (or "Add your name in your profile"); avatar on every page opens My profile.
- **Bug 8, 8a.** Fixed for tasks. T-041: Same for Settings: Manage cottages stays open after Back.
- **Bug 9, 10.** Fixed.
- **Bug 11.** Fixed: documents can be edited.
- **Bug 12.** Partly: the box empties and keeps the thread, but each question was answered on its own, so a real follow-up ("and in winter?") had no context. T-041: The last 3 questions and answers go with the next question; sources are ranked by the new and last one.
- **Bug 13.** Fixed: ADR-0009, previews.
- **Bug 14, 14a.** Fixed.
- **Bug 15.** Fixed for the signed-in change; the reset-link case is unverified (see below).
- **Bug 16.** Partly: every account now lists its cottages, which explains 3 vs 5 (before 0030 other accounts showed only "Switch to …"). But Test 1's family account is itself called `Chata Alfa (test)` and holds Alfa, Beta and Gama, so a heading with that name over the three still looks like nesting. T-041: Each group says "Family account · 3 cottages" / "Organisation account · 1 cottage" above the account name.
- **Bug 17.** **Not fixed:** days became tappable for organisations, but "Continue to booking", the overlap notice and the legend stayed family-only, so picking led nowhere. T-041: Shown for every account type; the database still decides (an organisation's stays wait for approval).
- **Bug 18.** Fixed: manifest `display: browser` confirmed live, `beforeinstallprompt` blocked.

Acceptance (runnable):

- CI on the PR (lint, types, format of changed files, all tests including `src/lib/t041.test.ts`, generated docs, build, e2e)
- After publish, signed in (tracker N-12): as Test 3 in `Institutní chata (test)`, Calendar → "+ Stay" → two days → "Continue to booking" opens the booking form; the switcher shows "Family account · 3 cottages" over `Chata Alfa (test)`; a manual question followed by "and in winter?" gets an answer about the same thing.

Handoff note: written from a cloud session that could not install dependencies (the Lovable registry rewrite is blocked here); type check, lint and format ran on the maintainer's machine copy where noted in the PR. Not verified in a browser. Still unverified from T-040: Supabase's `current_password` rule on the reset link (if it applies there, a person who forgot their password would be asked for it; check once with Test 2).

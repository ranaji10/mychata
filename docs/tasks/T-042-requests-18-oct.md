# T-042 Requests of 18 Oct 2026, T-040 review, tracker fixes

Owner: Claude (cloud session) · Status: review

Goal: (1) review whether the bugs of 18 Oct (T-040, T-041) are fixed and close the gaps; (2) fix what the tracker (`docs/external/claude/2026-09-25-critical-review.md`) lists that can already be fixed, and emulate the iPhone checks; (3) four requests of 18 Oct: counts in the cottages overview, auto booking approval for organisations, auto-confirmed bookings in Notifications, a family account named apart from its first cottage; (4) a full test of the site.
Non-goals: email or push for notifications; billing; the cookie banner (F-03); a HEIC converter (F-08, optional, needs a new dependency).
Files changed: migration `0032_booking_auto_approval_account_name.sql` (+ journal, snapshot), `src/routes/{chaty,clenove,onboarding,profil,rezervace.nova,upozorneni,host.$token,pozvanka.$token}.tsx`, `src/components/{AutoApproveChoice,TaskGroup,bits}.tsx`, `src/lib/{account-label,data,notification-list,notifications,guest.functions}.ts`, `src/integrations/supabase/types.ts` (patched for 0032), tests `src/lib/t042.test.ts` and `supabase/tests/security.test.ts`, docs.
Invariants touched (AGENTS.md): 1 (two new caller-checked definer functions, two anon functions changed), 2 (migration 0032), 5, 6.

## 1. Review of T-040 / T-041 (live `d6260db`, signed in with the four test sign-ins)

All 18 bugs were re-checked live in a real browser (Chromium, phone and desktop size, Czech and English). Fixed and confirmed: 1, 2, 3, 4–4c, 5, 6, 7, 8 (tasks: an open checklist stays open after Back), 9, 10, 11 (Edit on documents), 12 (a follow-up "A platí to i v zimě?" was answered about the house rules), 13, 14, 16 ("Rodinný účet · 3 chaty" above `Chata Alfa (test)`), 17 (Test 3 in `Institutní chata (test)`: "+ Pobyt" → two days → "Pokračovat k rezervaci" opens the booking form), 18. Bug 15 (password change) was not exercised, to keep the test passwords unchanged.

Gaps found and fixed:

- **Back from Photos, Manual, Documents or Maintenance** (bug 8 applied to Settings, claimed in T-041) went to the overview `/chaty`, not back to Settings, because the page's Back arrow was a fixed link. `PageHeader` now goes back in history when there is in-app history, and uses its link only for a page opened directly. Verified locally: Settings → Manage cottages → Photos → Back lands on Settings with the list still open.
- **Organisation members were told "Potvrdit rezervaci … ihned zapíše"** although the database holds their booking for an admin. The booking screen now says "Poslat ke schválení" whenever the stay will be held (organisation without auto approval, or a family cottage without auto-confirm), not only for overlaps.
- Maintenance with no tasks drew an empty white strip under "Žádné úkoly v tomto filtru"; cottage names are trimmed at onboarding (a trailing space showed as "Testing with Gemini : …").

## 2. Tracker items

- **F-01 (iPhone checks), emulated** with Chromium in Playwright's iPhone 13 profile (iOS Safari user agent, touch, 390×844; WebKit itself cannot be installed in the cloud container): avatar upload and removal work; Document Vault "Open" opens the file in a new tab (the tab is opened during the tap, as Safari requires); a refused clipboard shows the "select and copy" box with the link. What emulation cannot prove: Safari's own popup and clipboard rules and HEIC decoding; one tap on a real iPhone is still needed.
- **F-04** guest and invitation pages were always green: `public_guest_link` and `invitation_preview` now return `is_institution` (migration 0032) and the pages use the organisation's blue. Until 0032 is applied they stay green.
- **F-12** hero photo downloaded twice: not reproduced (one request on `/` and `/auth`). Can be closed.
- **N-10** signed-in checks, done live in `Chata Alfa (test)`: Test 2's overlapping booking says "Poslat ke schválení" and is held; it shows on Test 1's Home ("Pobyty ke schválení") and in Notifications; Approve confirms it; Test 2 can "Stáhnout žádost". T-040 items (Notifications, Maintenance, document edit) and T-041 items pass. The test stays and the test document were removed afterwards; a seasonal checklist "Zazimování chaty" was added to `Chata Alfa (test)` for the checklist test and left there.

## 3. Requests

- **Cottages overview** (Settings → Manage cottages → All cottages overview, `/chaty`): each cottage's Photos, Manual, Documents and Maintenance buttons show how many there are ("zatím nic" for none), and with several cottages a total line. Documents count those the viewer may see.
- **Auto booking approval** (ADR-0010): an organisation's admin answers Yes/No in onboarding (step "Pravidla rezervací"). Organisations onboarded before this see a highlighted prompt in Members & permissions until an admin answers; the answer can be changed there later. Yes: members' bookings are confirmed at once (the overlap rule still applies). No, or not answered: they wait for an admin, as before. An admin's own booking is always confirmed.
- **Auto-confirmed bookings in Notifications** (admins): one line per booking, or per day when there are several ("4 pobyty byly automaticky potvrzeny pro Chata Alfa"), for the last 7 days. The admin's own bookings and bookings an admin made for someone else are left out. Applies to families too (their members' bookings are auto-confirmed by default).
- **Account name** (ADR-0010): family sign-ups are asked for an account name in onboarding step 1, prefilled with the email before the @; the first cottage may not have the same name (the database refuses it too). Admins of family accounts that already have the same name as one of their cottages get a "Přejmenujte prosím účet" card in My profile and a Notifications item.

## Acceptance (runnable)

- `bun run check` (lint, types, format, 190 tests incl. `t042.test.ts`, generated docs); `bun run test:db` (79 tests incl. the 7 of T-042); `bun run build`.
- `E2E_BASE_URL=https://mychata.cz PW_CHROMIUM_PATH=/opt/pw-browsers/chromium bun run e2e`: 7/7.
- After merge and publish with migration 0032 (Lovable applies it), in the test cottages: as Test 3, Members & permissions → answer Yes; as Test 2 in `Institutní chata (test)`, a booking is confirmed at once and shows on Test 3's Notifications; as Test 1, My profile → rename `Chata Alfa (test)` (e.g. "Testovací rodina"); a guest link of `Institutní chata (test)` opens in blue.

Handoff note: the new UI was checked in a local dev server against the production database, read-only where it needs migration 0032 (the Members prompt, onboarding steps, the rename card, the booking screen wording, the counts). Not verified: anything that calls `set_booking_auto_approve`, `rename_account` or the new `create_account_onboarding` against the real database (only in the in-memory database tests), Safari itself, and the reset-link password case from T-040.

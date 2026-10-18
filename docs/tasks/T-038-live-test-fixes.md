# T-038 Fixes from the live test of 18 Oct

Owner: Claude · Status: review

Goal: fix what the signed-in live test of 18 Oct found (report `docs/external/claude/2026-10-18-site-check.md`) and the F-17 polish items, without schema changes.
Non-goals: D-16 (who may approve institution requests), the cookie banner's size (F-03), anything needing a migration.
Files allowed: `src/routes/*.tsx` (titles and the fixes below), `src/lib/page-title.ts`, `src/lib/data.ts`, `src/lib/invites.ts`, `src/lib/analytics.ts`, `src/lib/t038.test.ts`, `public/sw.js`, `supabase/tests/security.test.ts`, `docs/STATUS.md`, `docs/runbooks/test-cottages.md`, `docs/external/claude/*`, this file.
Invariants touched (AGENTS.md): 5 (all new text through `t()`), 6 (the stay lookup now uses `maybeSingle`).

Fixes:

- Held stays (T-036) can be decided from the app: Approve/Decline on the stay page for every admin (was institutions only); "Pobyty ke schválení" on a family admin's Home; "Stáhnout žádost" for the member who asked; the booking button says "Poslat ke schválení" when the stay will be held.
- Page titles follow the language (`src/lib/page-title.ts`, `PageTitleSync` in `__root.tsx`); route `head()` titles are Czech; GA page views carry the same title; 404 has its own title.
- Home: the photo's chip links to the calendar instead of repeating "Nejbližší pobyt"; "Odjezdové úkoly" only once the stay has started; the card says "Probíhající pobyt" then.
- Invitations: expiry counted in calendar days (`calendarDaysUntil`); wrong-account notice in warning colours; pre-0026 batches without a group link get "Zrušit pozvánku"; created/expiry dates by local day.
- A plain member sees "Veřejný odkaz na kalendář" only when the admin published it, and it no longer calls the admin-only function; "Vypnout veřejný kalendář" only for admins.
- Manual categories as words (`manualCategoryLabel`), also in the picker and the public manual.
- Local dates: `localISO()`; expense date, public calendar's free weekend, export dates.
- Decline dialog plural; service worker never caches `/_serverFn/` (cache v2 drops old entries).

Acceptance (runnable):

- `bun run check`
- `bun run test:db` (new: an admin confirms/declines a held booking, the member withdraws it, another account can do neither)
- After publish, as Test 2 in Chata Alfa (test): an overlapping booking shows "Poslat ke schválení", the held stay has "Stáhnout žádost". As Test 1: Home lists the held stay; Approve works.

Handoff note: check passes (0 errors, 146 tests) and test:db passes (69, one new). Verified on a local dev server against the live database as Test 2 (report, "Verified locally"). Not verified: anything as a family admin (Test 1 is Google-only), the wrong-account colour and old-invitation Cancel in a browser.

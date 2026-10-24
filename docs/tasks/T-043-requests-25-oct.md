# T-043 Requests of 25 Oct 2026: tab order, booking requests from the public calendar, analytics, cookie page, defects

Owner: Claude (cloud session) · Status: review

Goal: the five product requests of 25 Oct plus the open defects that need no outside party.

Non-goals: e-mail notifications (wait for N-5), Google signals / user-provided data in GA (terms to accept, a maintainer's decision), HEIC conversion (needs a new package), anything Lovable-only.

Files allowed: `drizzle/migrations/0034_*`, `drizzle/migrations/meta/*`, `src/components/{AppShell,AskBox,PublicBookingRequest,AnalyticsSnapshotCard}.tsx`, `src/lib/{analytics,analytics-snapshot,consent,data,guest-requests,i18n,notification-list,notifications,pending-booking}.ts(x)`, `src/routes/{__root,auth,clenove,dokumenty,domu,fotky,onboarding,pozvanka.$token,rezervace.$id,rezervace.nova,soukromi,ukoly,verejne.kalendar.$token,vydaje}.tsx`, `src/server.ts`, `src/styles.css`, `src/integrations/supabase/types.ts` (patched for 0034), `src/lib/t043.test.ts`, `supabase/tests/{harness,security.test}.ts`, `docs/**`.

Invariants touched: 1 (two new definer functions, caller-checked), 2 (migration 0034), 5 (all text through `t()`), 6, 7.

## What was asked and what was built

| #   | Request                                                                                                                                                 | Built                                                                                                                                 |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Tab bar: Home, Expenses, Calendar, Notifications, Settings                                                                                              | Family tabs reordered. Institutions keep Requests where families have Expenses (they have no shared expenses). Test in `t043.test.ts` |
| 2   | Public calendar: "Request a booking" → sign up → back to the same link after e-mail verification → admins approve; show when requested and who approved | Migration 0034 + `PublicBookingRequest`. ADR-0011                                                                                     |
| 5   | GA showing everything it can                                                                                                                            | GA4 property settings changed (below) + app events and user properties                                                                |
| 6   | Cookie page shows numbers from GA                                                                                                                       | `/soukromi` card "Takhle vidíme statistiky my" from `src/lib/analytics-snapshot.ts` (copied from GA, 27 Sep–24 Oct)                   |
| —   | Open defects                                                                                                                                            | F-03 cookie banner on phones (compact sheet + page room below it), F-06 security headers (`src/server.ts`), double gtag bootstrap     |

## Booking requests from the public calendar (ADR-0011)

- Signed out: "Požádat o termín" keeps the calendar token (localStorage, a day; e-mail sign-ups also in the account's metadata for a link opened in another browser) and opens `/auth`, which says why. After sign-in, Google's redirect or the confirmation link, `/auth` (or onboarding) returns to the calendar and the form opens.
- Signed in: pick days on the calendar, guests, note, send (`request_public_booking`). Answers: ok, unconfirmed e-mail, member (book in the app), dates, guests, busy (overlaps a confirmed stay; same-day changeover allowed), rate (3 a day per person, 20 a day per cottage), duplicate.
- Always held for an admin, also in organisations with auto approval. Admins see it on Home ("Žádosti o pobyt", with source and "požádáno …") and in Notifications; deciding uses the existing Approve/Decline (`decide_guest_request`).
- Who decided and when is stamped by the database (`guest_requests.decided_by_member_id/decided_at`, `bookings.approved_by_member_id/approved_at`); callers can't write them. The visitor sees "Vaše žádosti" with requested time, status and who approved or declined. The stay page shows "Schválil(a) … · time" (or "Potvrzeno automaticky"). Notifications list decisions of the last 14 days.

## Google Analytics (property "mychata.cz", G-6K9GYD9NSK)

Changed in GA4 on 25 Oct by Claude through the maintainer's signed-in browser:

- Event data retention 2 → 14 months (user data was already 14).
- Custom dimensions: event-scoped `source`, `method`, `step`, `booking_status`, `result`; user-scoped `account_type`, `member_role`, `app_language`. Custom metric `guests`.
- Unwanted referrals: `accounts.google.`, `supabase.co`, `lovable.` (Google sign-in made 31 % of sessions look like referrals from accounts.google.com).
- Found already on: enhanced measurement (all 7), Search Console link, user-ID collection allowed.

Not changed (decisions for the maintainers, D-26): Google signals and user-provided data both require accepting Google's advertising/user-data policies; key events can only be starred once the new events have arrived (after publish).

App side: `sign_up`, `login`, `login_start`, `booking_created`, `booking_decided`, `booking_request_sent`, `booking_request_sign_up_start`, `expense_added`, `task_created`, `invitation_sent`, `invitation_accepted`, `document_uploaded`, `photo_uploaded`, `manual_question` (never the text), `language_change`; user properties `account_type`, `member_role`, `app_language`. All still behind the consent banner. Runbook: `docs/runbooks/analytics.md`.

## Acceptance

- `bun run check` (lint 0 errors, types, format, 207 tests incl. 6 new database tests and `t043.test.ts`, generated docs).
- `bun run build`.

Handoff note: verified with the in-memory database and unit tests; the privacy page and banner at 390 px against a local dev server (no Supabase). Not verified: the sign-up → confirmation → return trip on mychata.cz (needs 0034 applied, and Claude may not type passwords on the live site), the cross-browser metadata return, security headers on Lovable's hosting (a response header the platform already sets wins), GA events arriving (the maintainer's Chrome blocks gtag.js: `window.google_tag_manager` is undefined there).

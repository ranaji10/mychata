# T-062 UX round of 5 Nov night, O-23 and O-24

Owner: Claude (cloud session) · Status: review

Goal: act on the maintainer's calls of 5 Nov 2026 (O-23 ask before publishing the calendar, O-24 allow 0-night stays for families and organisations) and fix the quick wins of the UX test on live `c3d1112` (`docs/external/claude/2026-11-05-ux-round.md`).

Non-goals: O-25 (past stays by admins, deferred 5 Nov); O-22's list/revoke part (dropped 5 Nov: links stay the same, only test data on the live site); findings U-7 to U-10 of the report (backlog O-26 to O-29); the dependency update (T-063).

Files allowed: `drizzle/migrations/0044_public_calendar_day_visits.sql`, `drizzle/migrations/meta/_journal.json`, `drizzle/migrations/meta/0044_snapshot.json`, `supabase/tests/security.test.ts`, `src/lib/data.ts`, `src/lib/pending-booking.ts`, `src/lib/t062.test.ts`, `src/components/bits.tsx`, `src/components/calendar.tsx`, `src/components/PublicBookingRequest.tsx`, `src/routes/rezervace.nova.tsx`, `src/routes/verejne.zadost.$token.tsx`, `src/routes/vice.tsx`, `src/routes/kalendar.tsx`, `src/routes/domu.tsx`, `src/routes/dokumenty.tsx`, `src/routes/ukoly.tsx`, `docs/STATUS.md`, `docs/external/claude/2026-11-05-ux-round.md`, `docs/external/claude/README.md`, tracker copies, this brief.

Invariants touched (AGENTS.md): 2 (migration 0044), 5 (all text through `t()`, 44 px targets kept).

## What changes

1. O-24: a stay may leave on its arrival day. Migration 0044 lets `request_public_booking` take it (the app and the organisation form already did). Messages say "Departure can't be before arrival"; New booking, the organisation form and the public calendar request show the length: "Day visit (no overnight)" or "3 nights" / "3 noci".
2. O-23: an admin's tap on Public calendar link (Settings, Calendar) asks "Publish the cottage calendar?" once; when it is published the tap only shares the link.
3. U-1: New booking with dates from the Calendar tab says "Chosen: … Other dates? Tap a new arrival day." With no day picked it no longer asks for the departure day first.
4. U-2: your arrival and departure are an outlined circle; confirmed stays stay solid. Legend text 13 → 15 px.
5. U-4: Home and the organisation form load their first picture eagerly (it arrived ~3.7 s late).
6. U-5: Maintenance filters wrap on a phone.
7. U-6: an empty Document Vault explains what goes there and offers "Add the first document" to admins.
8. U-3: Home cards of organisations get their own icons (requests, conflicts, overdue tasks).

## Acceptance

- `bun run check` (incl. `src/lib/t062.test.ts`, `supabase/tests/security.test.ts` "day visit")
- After Lovable applies 0044 and publishes: the steps in the report's "Recheck after publish".

Handoff note: in the PR.

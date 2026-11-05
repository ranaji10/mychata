# T-059 Number checks, expense payer, invitations (live test of 5 Nov 2026)

Owner: Claude (cloud session) · Status: review

Goal: fix what the 5 Nov live test with a fresh English sign-up found, and close O-21.

1. Rooms, people, beds and guests-at-once fields take whole numbers from 1 only (rooms ≤ 200, others ≤ 500), with a line under the field, in onboarding, "Finish setting up" and Edit cottage details. No more "saved" when nothing was.
2. New booking refuses an arrival in the past typed into the date field.
3. Members: existing members' addresses (the admin's own too) are not invited again.
4. The "Email" invitation text is in the sender's app language only (user rule: e-mails follow the selected language).
5. One duplicate warning on seasonal checklists.
6. Migration 0042: expenses and shares follow the payer rule (O-21); database checks for `rooms` and `overlap_max_guests`.

Files allowed: `drizzle/migrations/0042_*`, `drizzle/migrations/meta/*`, `supabase/tests/t059.test.ts`, `src/lib/{cottage-details,rpc-errors,invites}.ts`, `src/lib/{t059,invites}.test.ts`, `src/components/{CottageSetup,CottageDetailsEditor}.tsx`, `src/routes/{onboarding,rezervace.nova,clenove,domu,ukoly}.tsx`, `docs/STATUS.md`, `docs/generated/*`, `docs/external/claude/*`, this brief.

Acceptance: `bun run check`; `bun run test:db` (t059 RLS tests); after publish and 0042, the steps in `docs/external/claude/2026-11-05-site-check.md` ("Recheck after publish").

Not in scope (noted in the site check): "Guest booking link" makes a new link on every tap; tapping "Public calendar link" as an admin publishes the calendar without asking; departure on the arrival day is allowed.

# T-064 Messages about a stay, undecided requests, "cottage" in English

Owner: Claude (cloud session) · Status: review

Goal: act on the maintainer's calls of 6 Nov 2026: fix O-26 (a "Message from …" notification led nowhere), build O-27 (a request whose dates passed undecided showed "Awaiting approval" forever) and O-29 (English says "cottage" everywhere except the brand name MyChata).

Non-goals: a reply from the admin to the member (O-26 asked for the link to the stay; a reply is a new feature); expiring requests in the database (O-27 is shown, not changed: nothing is deleted or declined by itself); O-25 (past stays by admins, deferred); O-28 (bottom bar labels); O-30; Czech wording.

Files allowed: `drizzle/migrations/0046_message_admins_stay.sql`, `drizzle/migrations/meta/_journal.json`, `drizzle/migrations/meta/0046_snapshot.json`, `supabase/tests/t053.test.ts`, `src/integrations/supabase/types.ts` (message_admins args), `src/lib/data.ts`, `src/lib/notification-list.ts`, `src/lib/notification-email.ts`, `src/lib/t064.test.ts`, `src/components/calendar.tsx`, `src/routes/kalendar.tsx`, `src/routes/rezervace.$id.tsx`, `src/routes/domu.tsx` (guest requests), `src/lib/guest-requests.ts` (comment), English strings in `src/components/AppShell.tsx`, `src/lib/season.ts`, `src/lib/photos.ts`, `src/routes/auth.tsx`, `src/routes/chata.nova.tsx`, `src/routes/domu.tsx`, `docs/product/design.md`, `docs/generated/schema.md`, `docs/STATUS.md`, tracker copies, this brief.

Invariants touched (AGENTS.md): 1 (message_admins checks that the stay belongs to the caller's account), 2 (migration 0046), 5 (all text through `t()`).

## What changes

1. O-26: `message_admins(_account_id, _body, _booking_id default null)` replaces the two-argument version (0046). A given stay must belong to the account (`not_found` otherwise); the payload gets `booking_id` and `from_member_id`. Stay detail sends the stay. The notification opens `/rezervace/$id`; the e-mail's button is "View the stay" and says to approve or decline there. Messages without a stay keep opening Notifications. Two-argument calls (the live app until publish) still work.
2. O-27: `isUndecided(booking)` = pending and its departure day is before today. Calendar draws it grey ("Not decided" in the legend when one is there), the Calendar page lists them under "Requests not decided" with a link to each, the stay detail shows "Not decided" and "The dates passed and nobody decided on this request.", no Approve, no "Message the admin". Decline (admin) and Withdraw (booker) stay. Home and Notifications already skipped such stays. Guest requests (public calendar, guest link) whose dates passed: grey on Calendar, "Not decided" on Home with Decline only, and no longer in Notifications (PR #108 review). The public calendar and guest link pages keep their colours (no grey there).
3. O-29: "Add a cottage", "What's your cottage called?", "One shared cottage, no muddle.", "The cottage is available until …", "The cottage in spring/…" (photo alt), the photo permission message. design.md states the rule; a test fails on any English `t()` text with "chata".

## Acceptance

- `bun run check` (incl. `src/lib/t064.test.ts`, `supabase/tests/t053.test.ts` "O-26")
- After Lovable applies 0046 and publishes: as a member, on a waiting stay, Message the admin → the admin's notification opens that stay; Test Chata 2's 26 Oct–1 Nov request shows grey and in "Requests not decided"; the cottage switcher says "Add a cottage".

Handoff note: in the PR.

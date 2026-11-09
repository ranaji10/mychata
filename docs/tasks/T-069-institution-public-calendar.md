# T-069 One list for every booking request; public calendar for families only

Owner: Claude (cloud session) · Status: review

Goal: close F-34, found in the 9 Nov N-29 test, the way Tuik decided on 9 Nov (D-35):

- **No public calendar for institutions.** Since 29 Sep the app offered it to families only, but the database still served it for institutions: an institution cottage with the flag on (Institutní chata (test)) showed its calendar to anyone holding the request-form token (`/verejne/kalendar/` instead of `/verejne/zadost/`) and took booking requests its admin could neither see in Settings nor switch off. It can come back if institutions ask for it.
- **Every booking request in the Requests list,** public ones (guest link, public calendar) easy to tell apart. Families reach Requests from Home and Notifications; their tab bar is unchanged (Tuik, 9 Nov).

Non-goals: a Requests tab for families; changing the employee request form; deciding held stays on the Requests page (the card opens the stay, as Home did).

Files allowed: `drizzle/migrations/0050_public_calendar_family_only.sql` + journal + snapshot, `supabase/tests/security.test.ts`, `src/components/PublicRequests.tsx` (new), `src/components/bits.tsx`, `src/styles.css`, `src/routes/zadosti.tsx`, `src/routes/domu.tsx`, `src/lib/notification-list.ts`, `src/lib/sign-out.ts`, `src/lib/t069.test.ts` (new), `src/lib/t046.test.ts`, `src/lib/t064.test.ts`, `docs/STATUS.md`, `docs/decisions/ADR-0014-*.md`, this brief, tracker copies.

Invariants touched: 1 (definer functions keep their caller checks and grants), 2 (new migration), 5 (all new text through `t()`), 6 (held-stays read handles its error).

## What changes

1. **Migration 0050.** Switches the flag off on every institution cottage (token kept: the request form uses it). `set_public_calendar` refuses to switch it on for an institution (`family_only`); `public_calendar`, `public_property` and `request_public_booking` treat an institution cottage as switched off even if the flag is set again by a direct write. Old app versions keep working.
2. **Requests (`/zadosti`)** is open to family admins too. Order: public requests (`PublicRequests`: violet left edge and tint, "Veřejná žádost / Public request" badge, source line, Decline / Confirm stay, the D-30 invite offer), then members' stays held for approval (families) or employee requests and the usage export (institutions). Members still see "An admin handles the requests."
3. **Home** keeps no request lists: admins get one "Booking requests (N)" card to Requests, with "Public: N" in violet. The institution "Pending requests" tile counts public requests too.
4. **Notifications** about public requests (new and declined) open Requests.
5. **Tokens:** `--public` #5B3FA6 (white text 7.8:1) and `--public-soft` #F1ECFA (violet text 6.7:1); `PillPublic`.
6. **Sign-out:** a local sign-out that throws (auth-js 2.119 rethrows a `SIGNED_OUT` listener's error after removing the session) is handled like a returned error.

## Acceptance

- `bun run check` exit 0 (550 tests); `bun run test:db` 198 passed, the three 0050 checks fail without the migration; `bun run build` exit 0.
- Lovable applies 0050 exactly as written, then publish.
- Live, Test 3 (Institutní chata (test)): `/verejne/kalendar/<its token>` says the calendar is switched off; the request form works. Test 5 (family): Requests from Home shows a public request in violet; Notifications opens Requests. Test 5's published calendar still works.

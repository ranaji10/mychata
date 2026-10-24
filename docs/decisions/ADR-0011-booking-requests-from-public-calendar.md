# ADR-0011 Booking requests from the public calendar go through an account and always wait for an admin

Status: proposed · Date: 2026-10-25

## Context

The 25 Oct request: a public calendar link gets "Request a booking"; the visitor must create an account, confirm the e-mail, come back to the same link, and the request goes to the admins, with when it was requested and who approved it visible. Guest links (`/host/<token>`, migration 0012) already let people without an account ask; the public calendar must not become a second anonymous form (spam, no verified address).

## Decision

- Reuse `guest_requests` (the admin queue, Home, Calendar and Notifications already read it) with `source = 'public_calendar'`, `requester_user_id`, and no guest link.
- `request_public_booking(token, …)` is for signed-in callers only, needs `auth.users.email_confirmed_at`, refuses members of the account (they book in the app), dates that overlap a confirmed stay, and more than 3 a day per person / 20 a day per cottage.
- Such requests always wait for an admin, also in organisations with auto approval (ADR-0010 covers members only).
- The database stamps who decided and when (`guest_requests.decided_*`, `bookings.approved_*`) in triggers; callers can't set them.
- Approving does not make the visitor a member; the stay is booked under their name, as for guest links.

## Consequences

- A visitor's account exists without a cottage; if they later open the app they go through onboarding like any new person.
- E-mail confirmation depends on "Confirm email" being on (F-07). While it is off, Supabase marks sign-ups confirmed at once and the check passes without a real confirmation.
- Requesters learn the decision by revisiting the calendar link; an e-mail waits for the e-mail setup (N-5).

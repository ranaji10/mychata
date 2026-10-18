# ADR-0010 Auto booking approval per organisation, account names apart from cottages

Status: accepted · Date: 2026-10-18

## Context

Requests of 18 Oct 2026 (T-042):

- Organisations could not choose how bookings are approved: every booking a plain member made
  in an organisation's cottage waited for an admin (`booking_defaults`, migrations 0024/0028).
  Families had a per-cottage `properties.auto_confirm` (default on) that organisations ignored.
- A family account and its first cottage often had the same name ("Chata Alfa (test)" holding
  Alfa, Beta and Gama), because onboarding never asked for an account name and used the first
  cottage's. Lists of accounts and cottages then read as if Beta were inside Alfa (bug 16).
- Admins wanted to see bookings that were confirmed without them.

## Decision

1. **The answer is stored per account**, `accounts.booking_auto_approve`: `null` = not decided,
   `true` = members' bookings are confirmed at once, `false` = they wait for an admin. Not
   decided behaves like `false`, so nothing changes for an organisation until an admin answers.
   It is asked in onboarding and, for organisations set up earlier, in Members & permissions.
   Only an admin of that organisation sets it (`set_booking_auto_approve`, audited). Families
   keep `properties.auto_confirm`.
2. **An admin's own booking is always confirmed**, whatever the answer (unchanged from T-036).
   The overlap rule of 0028 still holds a member's booking when the cottage said "No" to
   overlaps or the guest limit is exceeded, even with auto approval on.
3. **`bookings.auto_approved`** is set by the database, never by the client: true when a booking
   is confirmed on creation for the person who made it, with nobody deciding; it turns false if
   the stay is later held. Notifications use it; no notifications table yet (T-040 non-goal).
4. **A family account's name must differ from its first cottage's** (case and spaces ignored).
   Onboarding asks for it, prefilled from the email before the @; `create_account_onboarding`
   refuses a clash; `rename_account` lets an admin rename (audited) and refuses the name of any
   of the account's cottages. Organisations are not checked: a school with one chata may well
   use the same name for both.

## Consequences

- Organisations onboarded before 0032 show the prompt until answered; their members' bookings
  keep waiting meanwhile.
- The app predicts the outcome on the booking screen ("Poslat ke schválení") with the same rule;
  the database stays the authority.
- Existing family accounts named like a cottage are not renamed automatically; their admins are
  asked in My profile and Notifications.

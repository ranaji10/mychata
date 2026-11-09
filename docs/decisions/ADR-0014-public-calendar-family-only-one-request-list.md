# ADR-0014 Public calendar for families only; one list for every booking request

Status: accepted · Date: 2026-11-09

## Context

ADR-0011 added booking requests from the public calendar. Since T-021 (29 Sep) the app offered the calendar to families only, but the database still served it for institution cottages, whose public token is also the employee request-form token. On 9 Nov (N-29 test, F-34) an institution test cottage showed its calendar and accepted a request that its admin could not see in Settings or switch off, and that the "Pending requests" tile did not count. Booking requests were also split: employee requests on Requests (institutions), guest-link and public-calendar requests and held member stays on Home.

## Decision

- The public calendar is for family cottages only, enforced in the database (migration 0050), not just hidden in the app. It can come back if institutions ask for it.
- Every booking request an admin decides is listed on the Requests page, for families too (reached from Home and Notifications; the family tab bar is unchanged). Requests from people outside the cottage (guest link, public calendar) come first, in their own violet look with a "Public request" badge.

## Consequences

- An institution's request-form link no longer exposes its calendar. Institutions that want a public calendar need a new decision and migration.
- Home shows only a count and a link for requests; deciding takes one tap more from Home, but every request is in one place.
- `--public` is a new colour token; it means "from outside the cottage" and should not be used for anything else.

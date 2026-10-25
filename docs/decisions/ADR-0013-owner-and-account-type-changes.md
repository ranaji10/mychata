# ADR-0013 An explicit owner, and account type changes once in six months

Status: accepted · Date: 2026-10-25

## Context

"Owner" meant the oldest admin with a sign-in (`account_founder()`, migration 0028): founders were stored as `ADMIN`, so ownership could drift when the founder left or an early unclaimed member row was claimed (tracker D-22). Only family → organisation existed, with no limit (D-03). Billing (T-009, pricing v2) will charge organisations first, so who may switch an account between free and paid types, and how often, must be settled before billing ships.

## Decision

- Every account has exactly one `OWNER` row (partial unique index). Migration 0036 makes the oldest admin with a sign-in the owner; new accounts get one from the first member row with a sign-in. `OWNER` counts as admin everywhere (`has_account_role(…, 'admin')`).
- Only the owner hands the account to another admin with a sign-in (`transfer_account_ownership`); the old owner stays an admin. Nobody can demote the owner (`set_member_role` refuses).
- Only the owner changes the type, both ways (`change_account_type`), at most once in six months (`accounts.type_changed_at`). To an organisation: work-email sign-in and a name, as before. To a family: a name that is not a cottage's. `convert_account_to_institution` now goes through the same function.
- While a paid subscription is trialing, active or past due, the function refuses (`billing_change_required`). When billing ships, the type change becomes a billing operation: end or prorate the current plan, start the other audience's plan, then call the same function from the server with the provider's confirmation. The six-month rule stays, so nobody switches back and forth to dodge a price.
- Institution stay requests from the public institution form are read and decided by admins only (D-16).

## Consequences

- The owner is visible ("Vlastník") and changes only on purpose; billing will charge and e-mail the owner.
- An owner who leaves without handing over leaves the account without one; a support step (service role) must reassign it. Worth a "hand over before you leave" prompt when member removal exists.
- The six-month clock also applies after the first family → organisation conversion; support can clear `type_changed_at` for a genuine mistake.

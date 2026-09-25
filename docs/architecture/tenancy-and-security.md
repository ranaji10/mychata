# Tenancy and security

## Model (ADR-0002)

- `accounts`: a family or an institution. Billing unit.
- `members`: one row per person per account (`user_id` may be empty for relatives without a login). `role` is `OWNER`, `ADMIN` or `MEMBER`. This is the only role store; `user_roles` is legacy and grants nothing.
- `profiles.active_account_id`: which account the person is working in. `current_account_id()` returns it if they still belong there, otherwise their oldest membership. Switch with `set_active_account()`.
- `property_admins`: per-chata admins (from onboarding or an ADMIN invitation).

## Rules enforced in the database

| Data                                    | Read                                              | Create                   | Change / delete                                                                                 |
| --------------------------------------- | ------------------------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------- |
| Bookings                                | Members of the active account                     | Members (as themselves)  | The booker or an admin                                                                          |
| Tasks                                   | Members                                           | Members                  | Members change; admins delete                                                                   |
| Expenses                                | Members                                           | Members                  | The payer or an admin                                                                           |
| Settlement (`expense_splits.paid_back`) | Members                                           | Members                  | Only the person owed (the payer) or an admin                                                    |
| Handovers                               | Members                                           | Members                  | The author or an admin                                                                          |
| Photos                                  | Members                                           | Members                  | Anyone sets the main photo; uploader or admin deletes                                           |
| Documents                               | Members; `ADMINS_ONLY` rows and files admins only | Admins                   | Admins                                                                                          |
| Manual sections                         | Members                                           | Admins                   | Admins                                                                                          |
| Invitations                             | Admins                                            | Admins                   | Admins                                                                                          |
| Member roles                            | Members                                           | Invitation or onboarding | `set_member_role()` only; last admin protected; members can edit only their name, phone, branch |

## What anonymous visitors can reach

Only functions keyed by an unguessable token, never by a property id:

| Page                        | Function                                                                 | Returns                                                                           |
| --------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| `/verejne/kalendar/<token>` | `public_calendar`                                                        | Dates and status, only if an admin published the calendar (`set_public_calendar`) |
| `/verejne/manual/<token>`   | `public_manual`, `public_flag_manual_section`                            | PUBLIC sections only; flags capped                                                |
| `/verejne/zadost/<token>`   | `submit_institutional_request`                                           | Institutions only; rate-limited                                                   |
| `/host/<guest token>`       | `public_guest_link`, `public_guest_availability`, `submit_guest_request` | Per guest link; rate-limited                                                      |

Admins can issue a new token with `rotate_public_token()` if a link leaks. Printed QR codes from before migration 0012 no longer work.

## Checks that keep it this way

`supabase/tests/policy-lint.test.ts` fails when a migration gives anonymous visitors table access, or adds a SECURITY DEFINER function without a caller check, unless `supabase/security-allowlist.json` has a reviewed entry.

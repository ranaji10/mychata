# ADR-0002 One person, many accounts: `members` is the membership table

Status: accepted · Date: 2026-09-25 · Migration 0011

## Context

`members.user_id` was unique and `current_account_id()` used `LIMIT 1`, so a person could belong to one account only. Admin was a global flag in `user_roles`. Institutions, property managers and relatives with two family chatas need several accounts; subscriptions bill per account.

## Decision

Keep `members` as the membership table (one row per account and user, unique on both). Store the active account on `profiles.active_account_id`. Read roles from `members.role` in the active account; `has_role()` keeps its signature so older policies keep working. `user_roles` stays for history only.

## Consequences

Policies scope to the active account; switching is explicit (`set_active_account`). A child-table `account_id` column (T-013) would make policies and billing counts cheaper; not needed yet.

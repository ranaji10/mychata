# T-013 Copy account_id onto bookings, tasks, expenses, handovers, documents

Status: later (before billing counts or heavy traffic)
Goal: policies check `account_id` directly instead of joining through `properties`; usage counts per account become one indexed query.
Steps: add column, backfill from properties, trigger to fill on insert, rewrite policies, tests in supabase/tests.

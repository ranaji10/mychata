-- 0033: empty marker. Its only job is to make the migrator apply the journaled
-- migration 0032_booking_auto_approval_account_name (T-042), which is present in
-- drizzle/migrations/ and listed in meta/_journal.json but missing from the database.
-- The real SQL is 0032's, unchanged; nothing is copied into this file (rule 3a).
select 1;

# Backup (while on Lovable Cloud)

## What a backup is here

Lovable Cloud → Advanced settings → Export data produces a PostgreSQL dump (custom format, PostgreSQL 17). The 25 Sep export was checked: it contains every app table (30), sign-in accounts (`auth` schema, 27 tables incl. users and identities) and the file list (`storage.objects`). It is enough to rebuild the database elsewhere.

It does **not** contain the uploaded files themselves (photos, documents); only their names. Until own hosting (T-002), ask Lovable once a quarter to zip the `my-chata-files` bucket.

Google Analytics is not a backup: it holds anonymous page views and events by design, no accounts, no bookings, nothing restorable, and nothing at all for visitors who declined cookies.

## Routine

- Monthly (calendar reminder, first Monday, ~2 minutes): Export data → save as `mychata-YYYY-MM-DD.backup`.
- Keep the last 3 monthly files; delete older ones (the privacy policy should say so).
- Store them encrypted and outside the repo and outside Lovable (e.g. an encrypted macOS disk image). They contain everyone's e-mail address and password hashes.
- After each export, check the file is larger than 100 kB and starts with `PGDMP`.

## Restore test (once, before relying on it)

On a machine with PostgreSQL 17 client tools: `pg_restore -l file.backup | head` lists the contents; a full restore into an empty Supabase project is part of T-002.

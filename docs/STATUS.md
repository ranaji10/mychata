# Status

As of 2026-09-25. Update this file in every PR that changes behaviour.

## Where things are

| Place                   | State                                                                                                                                     |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Production (mychata.cz) | `2905bc4` published by Lovable 2026-09-26 ~02:50 (B-003 fix, preview image). Five checks and release tag pending (`runbooks/release.md`). |
| Database                | Migrations up to 0018 applied. 0018 is an exact copy of 0017 that Lovable added to trigger its migrator; both ran, harmless. Keep both.   |
| Backup                  | Full export taken 2026-09-25 (`Lovable DB exports/`, outside the repo). Routine: `runbooks/backup.md`.                                    |
| CI                      | Green on `main`. Nightly production check runs at 05:17.                                                                                  |
| Open bugs               | B-004 (Google sign-in on Brave), B-005 (Firefox session → T-014).                                                                         |
| Open tasks              | T-014 performance, T-015/T-016 missing tests (from Lovable's 26 Sep review), T-001–T-013 as listed below.                                 |

## Defects found on 2026-09-25 and their state

"Proven" means a test in `supabase/tests/before-fix.test.ts` reproduces it on the old schema.

| #   | Defect                                                                                      | Proven       | Fixed on branch                 | Test                                                               |
| --- | ------------------------------------------------------------------------------------------- | ------------ | ------------------------------- | ------------------------------------------------------------------ |
| 1   | Manual chunks readable across accounts, and by anonymous callers, via `match_manual_chunks` | yes          | 0014                            | security.test.ts "tenant isolation"                                |
| 2   | RAG never stored an embedding (`lang` column missing, 3,072 vs 768 dims, errors ignored)    | yes (schema) | 0014 + `manual-qa.functions.ts` | needs live AI key to verify end to end                             |
| 3   | All PUBLIC manual sections listable by anyone                                               | yes          | 0012                            | "anonymous access"                                                 |
| 4   | Address and booked dates by property id                                                     | code review  | 0012                            | "anonymous access"                                                 |
| 5   | Make/remove admin always failed                                                             | yes          | 0011 + `clenove.tsx`            | "roles"                                                            |
| 6   | Guest booking submissions refused                                                           | yes          | 0012 + `guest.functions.ts`     | "guest and institutional forms"                                    |
| 7   | One account per person; invites to existing users failed                                    | code review  | 0011                            | "multi-account membership"                                         |
| 8   | Public request form tied to the demo institution                                            | code review  | 0012 + routes                   | e2e `public.spec.ts`; demo data itself still in production (T-012) |
| 9   | Any member could edit/delete everyone's bookings, expenses, settlements                     | code review  | 0013                            | "row ownership"                                                    |
| 10  | Admin-only document files readable by members                                               | code review  | 0013                            | "row ownership"                                                    |
| 11  | No limits on AI calls or public forms                                                       | code review  | 0012, 0015                      | "usage limits", "guest ... rate limited"                           |
| 12  | Local copy not runnable (key typo, stray lockfile, uncommitted reformat)                    | seen         | yes                             | n/a                                                                |
| 13  | A member could set their own role to ADMIN (latent until roles moved to `members.role`)     | yes          | 0011                            | "roles"                                                            |
| 14  | `bun.lock` points at Lovable's private package cache, so installs fail outside Lovable      | seen         | CI workaround                   | CI step                                                            |

## Verified (2026-09-25)

- `bun run check`: lint 0 errors, typecheck clean, 35 tests pass (security 20, before-fix 6, policy lint 4, unit 5), generated docs current.
- `bun run build` succeeds.
- Playwright public smoke tests: 5/5 against a local dev server.
- Lovable (independently): migrations applied without data loss; share tokens present on every chata; app builds.
- Not verified yet: signed-in flows in a browser, AI answers with a real key, the account switcher UI, public links in a private window (T-001 step 5).

## Known limitations still open

See `docs/tasks/` for each: applying migrations (T-001), own hosting (T-002), staging (T-003), signed-in e2e (T-004), email (T-005), error monitoring (T-006), RAG worker and test set (T-007, T-008), billing integration (T-009), direct bookings and guest registration (T-010), calendar sync (T-011), demo data removal (T-012), `account_id` on child tables (T-013).

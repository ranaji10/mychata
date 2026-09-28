# Status

As of 2026-09-28. Update this file in every PR that changes behaviour.

## Where things are

| Place                   | State                                                                                                                                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Production (mychata.cz) | Runs PR #8 (T-017, B-006–B-010), confirmed by the 28 Sep network recording. No release tag yet (`runbooks/release.md`).                                                                           |
| Database                | Migrations up to 0018 applied. 0019 (remove demo data, T-012) and 0020 (invitation fixes) are on branch `agent/claude/T-019-invites-signin-demo`: take an export, then ask Lovable to apply both. |
| Backup                  | Full export taken 2026-09-25 (`Lovable DB exports/`, outside the repo). Routine: `runbooks/backup.md`.                                                                                            |
| CI                      | Green on `main`. Migration guard (duplicate numbers, journal, edits to applied files) runs first. Nightly production check scheduled 05:17; first run 26 Sep started 10:33 and passed.            |
| Open bugs               | B-004 (Google sign-in on Brave), B-005 (Firefox session → T-014). B-011–B-017 fixed on branch T-019, not yet live.                                                                                |
| Open tasks              | T-019 review, T-020 document vault search (planned), T-014 performance, T-015/T-016 missing tests, T-001–T-013 as listed below.                                                                   |

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

## Walkthrough bugs of 2026-09-26 (T-017)

Branch `agent/claude/T-017-review-bugs`. All are **fixed on branch, not yet live**. Tests written but not yet run (see the PR's Verification section).

| Bug   | What                                                                    | State                                                           | Test                                                   |
| ----- | ----------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------ |
| B-006 | Handover could only be saved with every item ticked                     | fixed on branch, not yet live                                   | `data.test.ts` "handover checklist" + manual check     |
| B-007 | Photo upload hid the real error; no resize; `makePrimary` ignored error | fixed on branch, not yet live                                   | `photos.test.ts` + manual check (resize needs browser) |
| B-008 | Profile phone empty after save and reload                               | fixed on branch, not yet live; root cause not confirmed         | security.test.ts "profile phone (B-008)"               |
| B-009 | Expense with no one else in the split shown as "Settled"                | fixed on branch, not yet live                                   | `data.test.ts` "expense settlement"                    |
| B-010 | Assignee list must follow `current_account_id()`                        | fixed on branch, not yet live; write-side gap open (needs 0019) | security.test.ts "assignee list (B-010)"               |

## Verified (2026-09-25)

- `bun run check`: lint 0 errors, typecheck clean, 35 tests pass (security 20, before-fix 6, policy lint 4, unit 5), generated docs current.
- `bun run build` succeeds.
- Playwright public smoke tests: 5/5 against a local dev server.
- Lovable (independently): migrations applied without data loss; share tokens present on every chata; app builds.
- Not verified yet: signed-in flows in a browser, AI answers with a real key, the account switcher UI, public links in a private window (T-001 step 5).

## Known limitations still open

See `docs/tasks/` for each: applying migrations (T-001), own hosting (T-002), staging (T-003), signed-in e2e (T-004), email (T-005), error monitoring (T-006), RAG worker and test set (T-007, T-008), billing integration (T-009), direct bookings and guest registration (T-010), calendar sync (T-011), demo data removal (T-012), `account_id` on child tables (T-013).

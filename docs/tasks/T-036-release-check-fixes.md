# T-036 Release check fixes (17–18 Oct 2026)

Owner: Claude · Status: review

Goal: fix what the live release check of 17 Oct found after PR #47 (T-035 + migration 0026), and apply the maintainers' decisions on the PR #46 review's open points.
Non-goals: email delivery (N-5), the phone cookie banner, billing (T-009), per-cottage conversion to an organisation.
Files allowed: `drizzle/migrations/0028_*`, `drizzle/migrations/meta/*`, `supabase/tests/security.test.ts`, `src/routes/rezervace.nova.tsx`, `src/routes/__root.tsx`, `src/routes/chaty.tsx`, `src/routes/pozvanka.$token.tsx`, `src/components/InstitutionSetup.tsx`, `src/components/AppShell.tsx`, `src/routes/zadosti.tsx`, `src/routes/verejne.zadost.$token.tsx`, `docs/architecture/billing.md`, `docs/runbooks/test-cottages.md`, `docs/STATUS.md`, `docs/generated/*`, `docs/external/claude/`, this file.
Invariants touched (AGENTS.md): 1 (booking_defaults and convert_account_to_institution, both definer, both check the caller), 2 (migration 0028), 5, 6.
Context: `docs/external/claude/2026-10-17-release-check.md`, `docs/external/claude/2026-10-17-pr46-review.md` (findings 8 and 9).

| Item                                                                                                    | Fix                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Overlap "No" ignored (found live: a member's overlapping stay on a "No" cottage was confirmed)          | `booking_defaults()` holds a plain member's own overlapping booking as PENDING when `overlap_allowed = false`, or when overlapping guests + new guests exceed `overlap_max_guests`. The booking screen explains it. |
| Decision 2: only the owner converts                                                                     | `convert_account_to_institution()` requires the founding member (oldest member with a `user_id`, an OWNER row first if one ever exists); audit-logged.                                                              |
| Sign-out leaves cached data (found live, from My profile)                                               | `SignOutCleanup` in `__root.tsx` clears the query cache and removes `mychata.offline-cache` on `SIGNED_OUT`, again after 2 s.                                                                                       |
| Small: member sees "Add a cottage"; "Open" badge read as a button; name repeated on the invitation page | Fixed in `chaty.tsx` and `pozvanka.$token.tsx`.                                                                                                                                                                     |

Decisions recorded, no code: (1) the token guard keeps reading other accounts' tokens to refuse a clash (as built in 0026); (3) the organisation plan needs a verification step once billing limits are enforced (`docs/architecture/billing.md`); (4) group links keep showing masked invitee emails (`n***@domain`) to whoever holds the link.

Acceptance (runnable):

- `bun run check`
- `bun run test:db` ("release check of 17 Oct" block: three new tests)

Handoff note: verified with the database tests and typecheck. Not verified: migration 0028 on the live database (Lovable applies it), the booking screen text on a phone, sign-out cleanup in Safari.

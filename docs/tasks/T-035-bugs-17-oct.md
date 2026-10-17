# T-035 Bugs of 17 Oct 2026

Owner: Claude · Status: review

Goal: fix the 14 bugs in `private/Screenshots/Bugs/17102026_BugsList.rtf` (maintainers' folder) and the defects found while testing them.
Non-goals: billing, email sending (T-005), the phone cookie banner (deferred), staging.
Files allowed: `src/**`, `drizzle/migrations/0026_*`, `drizzle/migrations/meta/*`, `supabase/tests/security.test.ts`, `brand/`, `public/brand/og-image.jpg`, `public/manifest.webmanifest`, `scripts/brand-assets.ts`, `docs/STATUS.md`, `docs/generated/*`, this file.
Invariants touched (AGENTS.md): 1 (three definer functions with caller checks), 2 (migration 0026), 5, 6.

| Bug                                                  | Fix                                                                                                                                                                                                                                                                            |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1 Switching cottage → "This page did not load"       | Not reproduced in one account. Most likely a stale code-split chunk after a release (iOS tab kept open): the error page and `vite:preloadError` now reload once (`src/lib/stale-chunk.ts`). Switch failures show a toast. Re-check across accounts after publish.              |
| 2 Signed in with Gmail but header shows a work email | The header line was the organisation's name (an email). It now says "Organisation · …" and My profile shows "Signed in as" + every account with type and role.                                                                                                                 |
| 3 Link preview cut                                   | Stacked logo inside the middle square (`brand/logo-stacked.png`, `scripts/brand-assets.ts`).                                                                                                                                                                                   |
| 4 Reset link starts onboarding                       | `src/lib/password.ts` notes `type=recovery` before Supabase clears it; `RecoveryGuard` (root) and `/auth` send the person to `/reset-password`, which asks for the new password, then continues to Home/onboarding.                                                            |
| 4a Google sign-ups have no password                  | "Set a password" after onboarding and on My profile (`SetPasswordForm`, `password_set` metadata). Wrong-password message points Google users to Google or "Forgot password".                                                                                                   |
| 4b Show password                                     | `PasswordInput` with an eye button on sign-in/sign-up and every new-password field.                                                                                                                                                                                            |
| 5 Personal → institution                             | `InstitutionSetup` on My profile; `convert_account_to_institution()` (admin + work email); new organisation cottage via `/onboarding?kind=institution&fresh=1`; personal email → institution sign-up pre-filled, then the new institution invites the personal email as admin. |
| 6 Profile: photo, change password, institution       | Photo (256 px JPEG data URL on `profiles.avatar_url`, own view only), password card, institution card. Saving the profile no longer overwrites the photo with Google's.                                                                                                        |
| 7 Manage cottages                                    | `/chaty`; Settings rows for add cottage/photos/manual/documents replaced by one row.                                                                                                                                                                                           |
| 8 Overlap "No" still asked; house rules nagged       | `properties.overlap_allowed` + `set_property_overlap()`; onboarding records the answer; rules dropped from "missing", added from Manage cottages.                                                                                                                              |
| 9 Rename                                             | "Checkout Tasks" / "Odjezdové úkoly".                                                                                                                                                                                                                                          |
| 10–12 One link for many; tiles                       | `invitations.group_token`; `accept_invitation`/`invitation_preview` accept it for listed emails only; tiles via `groupInvitations()`; expired → "Create a new link".                                                                                                           |
| 13 Name shown twice; desktop "Add a chata"           | `accountContextLine()`; switcher names an account once; sidebar item removed.                                                                                                                                                                                                  |
| 14 Who booked overlapping dates                      | Hover tooltip on booked days (desktop), `OverlapNotice` under the calendar, dot on picked days that are booked.                                                                                                                                                                |

Also found and fixed: onboarding could not remove an extra cottage form; Home greeted twice ("Hello, X" in header and hero); Settings and Members subtitles repeated the cottage name.

Acceptance (runnable):

- `bun run check`
- `bun run test:db` (four new tests in "bugs of 17 Oct")

Handoff note: verified with `bun run check`, database tests, and a local run against a mocked backend (screenshots of Home switcher, Members tiles, My profile, Manage cottages, booking overlap on phone and desktop). Not verified: the real reset-password email round trip, Google sign-up password on the live auth, avatar upload on iOS, migration 0026 on the live database (Lovable applies it), cross-account switching on iPhone.

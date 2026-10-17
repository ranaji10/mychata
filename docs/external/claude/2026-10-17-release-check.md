---
source: claude
model: claude-opus-5-5
date: 2026-10-17
status: reviewed
live_commit: 860f7fe
verdict: "T-035 works live. Three defects found (overlap answer ignored, cached data kept after sign-out, stale Requests list), fixed in T-036 with migration 0028. Tag after T-036 is published and re-checked."
---

## Release check of 17–18 Oct 2026 (live commit 860f7fe, PR #47)

Signed-in checks on mychata.cz in the desktop app's browser pane (phone-width layout), with the three test accounts: Test 1 (Google; family "Chata Alfa (test)", three cottages, admin), Test 2 (email + Google; joined Alfa as member), Test 3 (email, work-style domain; onboarded as "Test Institute", and joined Alfa as member). Test data only, in test cottages (`docs/runbooks/test-cottages.md`).

### Build and database

- `<meta name="build-sha">` = `860f7fe` (Lovable's 0027 marker commit; no tree difference to `main` at `0c19fae`), build 20:25 UTC.
- 0026 is live: `set_property_overlap` and `convert_account_to_institution` answer `42501 Admin role required` for a foreign id; `properties.overlap_allowed` and `invitations.group_token` are readable; a new batch got a `group_token`; a non-listed account was refused by the group link.
- Lovable's 0026 round also changed `package.json`/`bun.lock` (`@lovable.dev/vite-tanstack-config` 2.25.3 → 2.26.5) and `previewAuthStorage.ts` (preview-only session seeding), outside prompt 19's "change nothing else". Harmless for the published site; worth knowing.

### Bugs of 17 Oct, live

| Bug                                | Result                                                                                                                                                                            |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 Switching cottage                | Pass: Home, Calendar, Photos, Manage cottages follow the switch; no error page                                                                                                    |
| 2 Signed-in identity               | Pass: header "Organisation · Test Institute"; My profile "Signed in as" + every account with type and role; switching family ↔ organisation in one sign-in recolours green ↔ blue |
| 3 Link preview                     | Pass: stacked logo, both parts inside the middle square (`og-image.jpg?v=edd2dd6f`)                                                                                               |
| 4 Reset link                       | Pass: email arrived; link asked for a new password, stayed signed in; new password works for sign-in                                                                              |
| 4a Google users set a password     | Shown on My profile ("Set a password"); not exercised                                                                                                                             |
| 4b Show password                   | Pass (eye on the sign-in field)                                                                                                                                                   |
| 5 Personal → institution           | Personal email: work-email form, sign-out path (not run). No per-cottage conversion (by design: the whole account converts)                                                       |
| 6 Profile                          | Pass: photo saved and shown in header; phone survives reload (also closes F-10/B-008)                                                                                             |
| 7 Manage cottages                  | Pass: list, house rules add, Fill in; see T-036 small fixes                                                                                                                       |
| 8 Overlap "No"                     | Stored and no longer nagged; but not enforced on bookings (defect 1)                                                                                                              |
| 9 Checkout Tasks                   | Pass                                                                                                                                                                              |
| 10–12 Group link and tiles         | Pass: one link, tile with created/expiry/joined, See all, member joined via link, other account refused. Old batches (before 0026) have no Cancel                                 |
| 13 Name twice; desktop Add a chata | Pass                                                                                                                                                                              |
| 14 Who booked                      | Pass: hover tooltip names the booker; notice under the calendar on the booking form                                                                                               |

Also passed: institution onboarding (5 steps, overlap Yes + limit saved), public stay request on the institution's link, approval from Requests; plain member sees no "Cancel stay" on someone else's stay.

### Defects found (fixed in T-036 unless noted)

1. **Overlap answer ignored.** Alfa set to "No"; Test 2's overlapping stay was confirmed at once with "Overlapping family stays are allowed". `overlap_allowed` and `overlap_max_guests` were never read by the booking flow. Fixed: `booking_defaults()` (0028).
2. **Cached data kept after sign-out.** After signing out from My profile, `mychata.offline-cache` (14 KB: email, members, invitations) stayed in the browser and was there when the next account signed in. From Settings it was cleared. Fixed: `SignOutCleanup`.
3. **Requests list stale for a minute.** A new public request didn't show until the cached list aged out. Fixed: refetch on open.
4. Members see "Add a cottage"/"Add a chata" that only admins can use. Fixed.
5. Public request page promises an email that is never sent. Fixed (copy).
6. Invitation page shows "Chata Alfa (test) · Chata Alfa (test)". Fixed.
7. Not fixed, low: "expires in 6 days" right after creating a 7-day link (rounds down on purpose); the mismatch notice on an invitation is green, not a warning colour; page titles stay Czech in English (`Přihlášení`, `Pozvánka do chaty`); the Members and Requests pages have no `<main>` landmark for screen readers; Home shows "Next stay" twice (photo card and card below); "Check Out" offered on a stay that starts in 9 days.

### Item 5 of the maintainers (password not accepted)

Four sign-ins as Test 2 returned `Invalid login credentials` from Supabase; the app sent the typed password unchanged. The account had an email identity from 16:19 and Google added at 21:41. After a reset (email delivered), the new password worked. Conclusion: no app defect found; most likely the sign-up password differed from the one remembered. Reset emails are delivered today.

### Not verified

Migration 0028 on the live database; avatar upload on iOS; desktop-width layout; the token guard against a hand-made clashing row on live (tests cover it); Brave/Firefox.

### Re-check after the T-036 publish (18 Oct, live `9fce136`)

- Migration 0028 live (Lovable's marker 0029, PR #49, nothing else changed). Prompt 20's first check query looked for the wrong name (`overlap_guests`; the function is `overlap_peak_guests`), so its `false` was expected; Lovable checked the right name.
- Overlap "No" on Chata Alfa (test), as Test 3 (plain member): the screen says the booking goes to the admin; the booking was saved PENDING; setting it CONFIRMED directly returned `403 admin_approval_required`. Pass (F-14).
- Sign-out from My profile: offline copy and active-cottage key removed. Pass (F-15).
- Requests: a new public request shows when Requests is opened from inside the app, but not after a full reload within a minute (the restored offline copy counts as fresh). Fixed in T-037 (F-16 stays open until then).
- Tagged `release-2026-10-18` on `9fce136`.

Source file: `docs/external/claude/2026-10-17-release-check.md` in the mychata repo.

# T-021 Fixes from the 28 Sep walkthrough (after demo data removal)

Owner: Claude Code · Status: review

Goal: fix the 17 notes from the 28 Sep walkthrough (T019Checks recording and console export) before the first release tag.
Non-goals: vector search for documents (T-020 stays planned), email notifications (CC-3), institutional request permissions.
Invariants touched (AGENTS.md): 1 (three new SECURITY DEFINER functions, all check the caller), 2 (migration 0022), 5, 6.

| # | Note | Cause found | Fix |
| --- | --- | --- | --- |
| 1 | Members & permissions page crashes | The offline cache saved a `Set`; after reload it came back as `{}` → `I.has is not a function` (console export 21:32) | Plain array + cache buster in `__root.tsx` |
| 2 | "No admin" after demo removal | Seen as a result of 1; accounts can still end up without one | 0022 promotes the oldest signed-in member of any account without an admin |
| 3 | Non-admin could confirm a guest booking | The browser wrote a booking (allowed for any member) then the decision, no check, no error handling | `decide_guest_request()` admin-only, one step |
| 4 | Approving takes 1–2 min, no feedback | No invalidation: the card waited for the 60 s refetch | Spinner, disabled buttons, card refreshes when the database confirms (also on /zadosti) |
| 5 | Demoted admin still shows green "Admin of this cottage" | Database was right; the page never re-read `property_admins` | Re-read after role change; badge only for current admins |
| 6 | Document Vault question does nothing | Vault "search" only filtered titles; manual answers relied on embeddings that were never stored and on a retired model | `askManual` reads the manual + document text (all of it, best matches first), picks a Gemini Flash model the gateway lists, cites sources, quotes the best passage without AI; `readDocumentText` reads PDF/photo (gateway), Word, text on upload |
| 7 | Public calendar has no CZ/EN switch | — | Added |
| 8 | "Leaving" → "Check Out" | — | English labels changed |
| 9 | Verification link opened twice → expired, re-sign-up sends nothing | Supabase answers "ok" for an existing email and sends nothing; the page ignored `#error_code=otp_expired` | Explains that the email is confirmed, offers sign-in and "Send the confirmation email again"; re-sign-up resends |
| 10 | Book a date → calendar; tap from/to | — | `/kalendar?book=1`, tap-to-pick on the calendar and in the booking form |
| 11 | Unanswered onboarding questions in My profile | No way to edit a cottage after onboarding | "Finish setting up your cottage" card + `update_property_details()` |
| 12 | Email sign-up doesn't prefill the name | Name came from the email address | Name field at sign-up and in onboarding; saved to profile and member rows |
| 13 | Custom split doesn't work / slow | Splits were read with the old expense list (race); custom amounts had to be typed from zero | One query for expenses + splits; custom prefilled with equal shares, live "left to assign" |
| 14 | Settle debts does nothing | Only one direction was marked, the other reappeared; a non-receiver got "saved" while 0 rows changed | `settle_debt()` both directions, receiver or admin, reports 0 changes |
| 15 | Sign-in page: three clear options, no magic link | — | Continue with Google / Sign up with email / Sign up as an Institute, plus "Already have an account? Sign in" |

Acceptance: `bun run check`; manual checks listed in `docs/STATUS.md` (T-021 row).

Handoff note: typecheck, lint and format run locally; unit and database tests (`src/lib/t021.test.ts`, `supabase/tests/security.test.ts` "walkthrough fixes") written, run in CI. PDF reading through the gateway's `file` message part is unverified until tried on production with a real file.

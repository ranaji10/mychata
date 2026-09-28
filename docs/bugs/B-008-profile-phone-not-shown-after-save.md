# B-008 Phone number on the profile is empty after saving and reloading

Reported: 2026-09-26 by walkthrough of mychata.cz · Status: partly fixed on branch `agent/claude/T-017-review-bugs` (not yet live); root cause not confirmed
Where: mychata.cz/profil, signed in, family account
Screenshot: none
Steps to reproduce: Můj profil → type a phone number → Uložit → "Profil uložen." → reload → Telefon is empty.
Expected / actual: expected the saved number. Actual: empty field.
Test that reproduces it: `supabase/tests/security.test.ts` → "profile phone (B-008)" runs the exact upsert PostgREST sends, commits it, then reads it back in a new request, for a person with and without an existing profile row, under all policies up to 0018 (profiles: "Users manage own profile" from 0003, insert/update policies from 0008; 0011 and 0013 don't change them).

Findings (from reading the migrations; see "Not verified" below):

- Database: `authenticated` has table-level SELECT/INSERT/UPDATE on `profiles`, no column-level revokes, no triggers, and every profile policy is `user_id = auth.uid()`. Nothing there should drop the phone on write or hide it on read. The test above is written to prove that.
- App: the form reset its fields whenever the `user` or `profile` object changed. Supabase replaces the `user` object on every auth event (the second `setUser` at start-up, token refresh, returning to the tab), so a number typed before such an event was wiped from the field, and whatever the field then held was saved. Likely cause, not proven.
- The save didn't read back what was stored, so a write that silently kept the old value would still show "Profil uložen."

Fix (`src/routes/profil.tsx`):

- The form resets only when the stored name or phone actually changes.
- Save uses `upsert(...).select().single()`, puts the stored row straight into the cache and fails loudly (with the real message) if the stored phone differs from what was typed.
- Phone field is `type="tel"` so phones show the number keypad.

Not verified: the database test has not been run yet (dependencies couldn't be installed on the machine this was written on). If it fails, the write is the problem and the failure names the policy. If it passes and the bug still happens live, compare the live `profiles` grants with `docs/generated/schema.md` (Lovable may have changed something outside migrations).

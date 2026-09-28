# B-016 Any text is accepted as a phone number

Reported: 2026-09-28 by maintainer review of mychata.cz · Status: fixed on branch `agent/claude/T-019-invites-signin-demo` (not yet live)
Where: mychata.cz/profil
Screenshot: none (network and console recordings in the workspace private/ folder)
Steps to reproduce: see Where.
Expected / actual: expected: a real phone number. Actual: anything was saved.
Test that reproduces it: `src/lib/data.test.ts` → "normalizePhone (B-016)"

Fix: `normalizePhone()` accepts +420 777 123 456, 777123456, 00420…, and other countries; stores `+420777123456`; empty is allowed. The profile shows a hint while the number is wrong and refuses to save it.

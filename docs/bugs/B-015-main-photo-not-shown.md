# B-015 Choosing a main photo doesn't change the cottage picture

Reported: 2026-09-28 by maintainer review of mychata.cz · Status: fixed on branch `agent/claude/T-019-invites-signin-demo` (not yet live)
Where: mychata.cz/fotky → set as main photo → Home
Screenshot: none (network and console recordings in the workspace private/ folder)
Steps to reproduce: see Where.
Expected / actual: expected: Home shows that photo. Actual: Home always showed the built-in stock picture; nothing read `property_photos.is_primary`.
Test that reproduces it: manual check in the release list

Fix: `src/lib/use-primary-photo.ts` loads a signed URL for the main photo; Home uses it and falls back to the stock picture. The photos page refreshes it after upload, set-as-main and delete.

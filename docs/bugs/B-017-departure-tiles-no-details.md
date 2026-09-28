# B-017 Past departures can't be opened

Reported: 2026-09-28 by maintainer review of mychata.cz · Status: fixed on branch `agent/claude/T-019-invites-signin-demo` (not yet live)
Where: mychata.cz/predani → Previous departures
Screenshot: none (network and console recordings in the workspace private/ folder)
Steps to reproduce: see Where.
Expected / actual: expected: see what was done. Actual: tiles showed only name, date and count.
Test that reproduces it: manual check

Fix: Tiles expand to list every item as done or skipped, with the note. The page is now called "Leaving checklist" / "Odjezdový checklist", and Home shows the last departure to whoever comes next.

# B-012 An expired or used invitation shows "Welcome"

Reported: 2026-09-28 by maintainer review of mychata.cz · Status: fixed on branch `agent/claude/T-019-invites-signin-demo` (not yet live)
Where: mychata.cz/pozvanka/<token>, signed in
Screenshot: none (network and console recordings in the workspace private/ folder)
Steps to reproduce: see Where.
Expected / actual: expected: an explanation. Actual: "Vítejte v chatě!" because `accept_invitation` returned null (no error) for unknown, expired and used links.
Test that reproduces it: "invitations (T-019)"

Fix: `accept_invitation` raises `invitation_not_found`, `invitation_expired` or `invitation_used`; opening your own accepted link again just switches to that account. The page explains each case.

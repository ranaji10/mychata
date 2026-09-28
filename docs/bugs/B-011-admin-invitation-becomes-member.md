# B-011 An admin invitation makes a plain member

Reported: 2026-09-28 by maintainer review of mychata.cz · Status: fixed on branch `agent/claude/T-019-invites-signin-demo` (not yet live)
Where: mychata.cz/clenove → invite someone as Správce → they accept
Screenshot: none (network and console recordings in the workspace private/ folder)
Steps to reproduce: see Where.
Expected / actual: expected: they are admin. Actual: plain member. The page saved the role as `admin`, but `accept_invitation` only recognised `ADMIN`.
Test that reproduces it: `supabase/tests/security.test.ts` → "invitations (T-019)"

Fix: Migration 0020: existing roles upper-cased, a trigger normalises every insert/update, a check constraint, and `accept_invitation` compares with `upper(role)`. Someone already in the account who accepts an admin invitation is promoted (never demoted). The members page now sends `ADMIN`/`MEMBER`.

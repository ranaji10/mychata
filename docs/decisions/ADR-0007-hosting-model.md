# ADR-0007 Keep Lovable hosting for now; move to own hosting after the foundation work

Status: accepted · Date: 2026-09-25

## Context

Lovable publishes production and applies migrations to the only database. Moving Lovable to a side branch while it still publishes would let unreviewed code reach production.

## Decision

Model A now: Lovable stays on `main`, limited to UI work; everything else arrives by PR; publish only after CI is green on that commit, and tag the release (`docs/runbooks/release.md`). Model B after staging and signed-in e2e tests exist (T-002): deploy from GitHub Actions to your own Cloudflare account, own Supabase project, Google sign-in configured in Supabase, own AI key; Lovable becomes a contributor on a branch.

## Consequences

Short term, Lovable's agent can still run SQL on production; mitigated by project Knowledge rules and review. The data export check (can we `pg_dump`?) decides how hard Model B is.

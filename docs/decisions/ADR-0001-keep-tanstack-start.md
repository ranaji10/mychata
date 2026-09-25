# ADR-0001 Keep TanStack Start; no Next.js migration

Status: accepted · Date: 2026-09-25

## Context

Earlier planning (`docs/01-ARCHITECTURE.md` in the old workspace) proposed Next.js "for SSR and SEO". The app already runs TanStack Start with server rendering on Cloudflare via Nitro, and Lovable generates and maintains code in this stack.

## Decision

Stay on TanStack Start. Server logic stays in `createServerFn` functions and database functions; no Supabase Edge Functions unless a task needs a scheduled or webhook endpoint that server routes can't serve.

## Consequences

No rewrite. SEO for public pages is available today. Agents must not follow Next.js conventions (`src/routes/README.md`).

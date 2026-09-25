# ADR-0006 The repository is the single source of truth

Status: accepted · Date: 2026-09-25

## Context

Plans and facts were spread over Notion (PRD, Build Log), Lovable plans, repo docs and workspace docs outside git. They contradicted each other (Next.js vs TanStack, OpenAI vs Gemini, npm vs Bun, a V2 date already past).

## Decision

Decisions and current facts live in this repo (`docs/`). Workspace docs from before 2026-09-25 are archived outside the repo. Notion: either archive it or keep it for product thinking only, with the repo linking to pages; the operator decides (see the action list).

## Consequences

Every agent can read the same files. A fact that exists in two places is a bug.

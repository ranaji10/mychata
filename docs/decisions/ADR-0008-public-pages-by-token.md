# ADR-0008 Public pages are addressed by share tokens

Status: accepted · Date: 2026-09-25 · Migration 0012

## Context

Public calendar and manual used the property id in the URL and in anonymous database reads, which exposed addresses and occupancy, and let anyone list every public manual section.

## Decision

Each property has a random `public_token`; public pages and anonymous functions take the token. The family calendar is private until an admin publishes it. Guest links keep their own tokens.

## Consequences

Old shared links and printed QR codes stop working; admins re-share from the app. Tokens can be rotated.

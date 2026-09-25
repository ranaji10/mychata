# ADR-0005 Limits, switches and audit live in the database

Status: accepted · Date: 2026-09-25 · Migration 0015

## Context

AI calls and public forms had no limits; there was no way to switch a feature off without a deploy; nobody could see who approved what.

## Decision

`bump_usage()` per user per day, `feature_flags` checked server-side (`feature_enabled()`), `audit_log` written by triggers on role and status changes. Billing tables exist but enforce nothing until a provider is chosen (T-009).

## Consequences

Turning off AI answers is one row update. Limits apply regardless of which client or agent calls.

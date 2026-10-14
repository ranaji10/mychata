# T-032 Switch off a public calendar link

Owner: Claude · Status: review

Goal: admins can switch a cottage's public calendar link off again. Until now Settings could only switch it on and copy it; the database function `set_public_calendar(_property_id, false)` (migration 0012) existed but no screen called it. Found on 14 Oct when Lovable could not switch off its test cottage's link.
Non-goals: no migration, no token rotation (the public house manual uses the same `public_token`, so rotating would break manual links and printed QR codes), no change to `kalendar.tsx`.
Files allowed: `src/routes/vice.tsx`, `docs/STATUS.md`, this brief.
Invariants touched (AGENTS.md): 5 (Czech-first text), 6 (the RPC error is shown).
Context: `drizzle/migrations/0012_public_links_by_token.sql` (`set_public_calendar`, admin-checked).

Acceptance (runnable):

- `bun run check` passes
- Settings (family accounts) shows "Vypnout veřejný kalendář" only while `public_calendar_enabled` is true; it asks for confirmation, calls `set_public_calendar(…, false)`, refreshes the cottage and confirms with a toast; a non-admin gets "Veřejný kalendář může vypnout jen správce."
- Afterwards `/verejne/kalendar/<token>` says the link is not valid; "Veřejný odkaz na kalendář" switches the same link back on

Handoff note: not verified in a browser. First real use: switching off the public calendar of "Testovací chata (Lovable)" after publish.

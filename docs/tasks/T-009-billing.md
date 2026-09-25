# T-009 Billing integration

Status: todo · Needs: legal entity, pricing validated with users, provider choice, VAT registration decision
Goal: subscriptions per account using the skeleton in migration 0015 (`docs/architecture/billing.md`): checkout for families, invoices (IČO/DIČ, QR payment) for institutions, webhook → `billing_events` → `subscriptions`, limits enforced in database functions.
Acceptance: webhook replay is idempotent (test); an account over its chata limit cannot add a chata (test).

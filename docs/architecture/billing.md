# Billing

Skeleton only (migration 0015). Nothing is charged and nothing is gated yet.

- `plans`: draft tiers with `limits` JSON (see `../product/pricing.md`).
- `subscriptions`: one per account (plan, status, seats, period end, IČO/DIČ, provider reference). Admins of the account can read it.
- `billing_events`: every webhook stored once by `provider_event_id` (unique), so retries are harmless. Service role only.
- `account_plan(account)` and `plan_limit(account, key)`: what an account is entitled to; default Family free / Institution.

## Next (T-009)

1. Choose provider: Stripe Billing + Stripe Tax, or a merchant-of-record service for B2C VAT; invoices with bank transfer and QR payment for institutions.
2. Webhook server route writes `billing_events`, then updates `subscriptions`.
3. Enforce limits inside database functions (`add_property` checks `plan_limit(..., 'properties')`), not only in the UI.
4. Marketplace money (guests paying hosts) is separate and regulated: Stripe Connect or a Czech gateway, V2 at the earliest.

## Organisation verification (decision of 17 Oct 2026)

A family account can become an organisation's (`convert_account_to_institution`, owner only, work email required), and an organisation sign-up only needs a work-style email. Before billing limits are enforced (T-009), add a verification step for the organisation plan: for example a confirmed email on the organisation's domain plus a manual check of the name, or an invoice-first activation. Until then the organisation type is not proof of being one.

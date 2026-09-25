# Analytics

## Implemented

GA4 (`G-6K9GYD9NSK`) with Consent Mode v2 set inline in `src/routes/__root.tsx` before the tag loads: denied by default in EU/EEA/UK/CH, analytics granted elsewhere, ads always denied. Banner in `src/lib/consent.tsx` (three choices, saved 12 months, logged to `consent_log`). Page views on router resolve and typed events in `src/lib/analytics.ts` with shared context (account type, language, number of chatas; never names or emails).

## Next

- Key events in GA4: `sign_up`, `onboarding_completed`, `booking_created`, `guest_booking_submitted`.
- Product analytics (funnels, retention) with PostHog EU, behind the same consent: task T-006 covers Sentry first.
- GA4 → BigQuery export (free) for anything external tools or Gemini need, instead of database access.

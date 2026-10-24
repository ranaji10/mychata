# Google Analytics: what is set up and how to refresh the privacy page numbers

Property: GA4 "mychata.cz" (account MyChata), web stream "Chata_GoogleA4", measurement ID `G-6K9GYD9NSK` (from `.env.production`). The tag loads in `src/routes/__root.tsx` with Consent Mode v2: analytics denied in the EU/EEA/UK/CH until the visitor agrees, advertising always denied.

## Settings (25 Oct 2026, T-043)

| Where in GA4 Admin                                              | Setting                                                                                                                              |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Data collection → Data retention                                | Event data 14 months, user data 14 months                                                                                            |
| Data display → Custom definitions                               | Event: `source`, `method`, `step`, `booking_status`, `result`; user: `account_type`, `member_role`, `app_language`; metric: `guests` |
| Data streams → Configure tag settings → List unwanted referrals | contains `accounts.google.`, `supabase.co`, `lovable.`                                                                               |
| Enhanced measurement                                            | all on                                                                                                                               |
| Product links                                                   | Search Console linked                                                                                                                |
| Not on (decision D-26)                                          | Google signals, user-provided data (both need accepting Google's policies and a privacy-page update)                                 |

After the next publish, in Admin → Events, star as key events: `sign_up`, `onboarding_completed`, `booking_created`, `booking_request_sent`, `invitation_accepted`.

## Events the app sends

See `docs/tasks/T-043-requests-25-oct.md`. Rule: never a name, e-mail, id, cottage name, question or answer text in an event or user property.

## Refresh the numbers on the privacy page

1. GA4 → Reports, date range "Last 28 days".
2. Tech → Tech details (Device category, then Browser); User → Demographic details (Country); Engagement → Pages and screens; Acquisition → Traffic acquisition for sessions.
3. Copy into `src/lib/analytics-snapshot.ts`: totals, whole-percent shares, the period. `t043.test.ts` checks shares add up to about 100.

## Known

- About 40 % of "users" are US visitors with 3 s engagement: largely automated checks (site-check subagents run from US cloud machines). An internal-traffic filter needs fixed IPs, which cloud runners don't have.
- Tag diagnostics says "0 % consent rate": advertising consent is always denied by design.

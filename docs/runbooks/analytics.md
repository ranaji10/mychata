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
| To switch on (D-26 "yes", 25 Oct; maintainer's click)           | Google signals, user-provided data: both ask to accept Google's policies. Privacy page already says so (T-045)                       |

Key events (Admin → Events → star): `onboarding_completed` (25 Oct) and `booking_created` (26 Oct). Still to star once they appear in Recent events (GA lists a new event about a day after it first arrives): `sign_up`, `booking_request_sent`, `invitation_accepted`.

## Switching on Google signals and user-provided data (D-26)

1. Admin → Data collection and modification → Data collection: "Google signals data collection" → Get started → Continue → Activate (accepts Google's advertising features policy).
2. Same page: "User-provided data collection" → Turn on → accept the terms. The app sends no e-mail or phone (D-27 sends only the sign-in UUID), so this only allows it.
3. Note the date in the table above.

## User ID (D-27, T-045)

After sign-in and only with analytics consent the app sets `user_id` to the sign-in's UUID (`setAnalyticsUserId` in `src/lib/analytics.ts`). Never e-mail or name. In GA4: Admin → Data display → Reporting identity "Blended" uses it.

## Live numbers on the privacy page (D-28, T-045)

`src/lib/analytics-live.functions.ts` reads the GA4 Data API when two hosting secrets exist; without them the page shows `analytics-snapshot.ts`.

State (26 Oct 2026): steps 1 and 3 done and `GA_PROPERTY_ID` saved (Claude in Chrome, the maintainer's Google account that owns the GA property: project `mychata-analytics` with no organisation, Data API enabled, service account `ga-reader@mychata-analytics.iam.gserviceaccount.com`, Viewer on the property). Left for a maintainer: the JSON key (step 2, Keys → Add key) and `GA_SERVICE_ACCOUNT_JSON` (step 4), then publish (step 5).

1. Google Cloud console (same Google account): create a project "mychata-analytics", enable "Google Analytics Data API".
2. IAM → Service accounts → create `ga-reader`; Keys → Add key → JSON. Keep the file out of the repo.
3. GA4 Admin → Property access management → add the service account's e-mail as **Viewer**.
4. Hosting secrets (Lovable → Project settings → Secrets, later own hosting): `GA_PROPERTY_ID` = `555902424` (account 409479780; Admin → Property details), `GA_SERVICE_ACCOUNT_JSON` = the whole JSON file.
5. Publish; `/soukromi` then says "(aktualizují se samy)". Rotate the key yearly; delete the old one.

## Events the app sends

See `docs/tasks/T-043-requests-25-oct.md`. Rule: never a name, e-mail, cottage name, question or answer text in an event or user property.

## Refresh the numbers on the privacy page (until D-28's secrets exist)

1. GA4 → Reports, date range "Last 28 days".
2. Tech → Tech details (Device category, then Browser); User → Demographic details (Country); Engagement → Pages and screens; Acquisition → Traffic acquisition for sessions.
3. Copy into `src/lib/analytics-snapshot.ts`: totals, whole-percent shares, the period. `t043.test.ts` checks shares add up to about 100.

## Known

- About 40 % of "users" are US visitors with 3 s engagement: largely automated checks (site-check subagents run from US cloud machines). An internal-traffic filter needs fixed IPs, which cloud runners don't have.
- Tag diagnostics says "0 % consent rate": advertising consent is always denied by design.

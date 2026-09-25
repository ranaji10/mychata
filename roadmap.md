# My Chata — Roadmap

## Done
- [x] Phases 1–6 (family bookings, bilingual tasks, institutional theme, expenses/settlement, handover, manual, vault, offline)
- [x] Security foundation (Google sign-in, RLS, public data via definer functions)
- [x] SEO (sitemap, Search Console)
- [x] Analytics: consent-gated GA4, router page-view tracking, typed events, queue cap 200
- [x] GDPR consent card + Privacy & cookies page + consent_log
- [x] Email/password + magic link + password reset sign-in
- [x] Onboarding checklist (5 steps, gated, per-chata admin, booking rules, house rules)
- [x] Invitations + Members & permissions page (last-admin protection)
- [x] My Profile page
- [x] Add chata + property switcher
- [x] Cottage photos with main-photo star
- [x] Guest booking links (no account) + guest requests card on Home
- [x] House Manual Q&A (RAG stage 1: embeddings + account-scoped retrieval)
- [x] Settings cleanup: collapsed Language row, removed nested toggles

## Open
- [ ] GA4 Measurement ID still needed from user to activate tracking (analytics.ts reads VITE_LOVABLE_CONNECTOR_GOOGLE_ANALYTICS_API_KEY — currently not a measurement ID)
- [ ] End-to-end test of signed-in flows (onboarding, invites, photos, guest links) needs a test account
- [ ] RAG stage 2+ (documents, bookings, tasks as sources) — deferred until stage 1 proves useful
- [ ] Email/SMS/push notifications — deferred until a delivery provider is chosen

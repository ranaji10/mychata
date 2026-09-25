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
- [x] GA4 Measurement ID synced from connector — verified gtag loads only after consent (HTTP 200)
- [ ] End-to-end test of signed-in flows (onboarding, invites, photos, guest links) needs a test account
- [ ] RAG stage 2+ (documents, bookings, tasks as sources) — deferred until stage 1 proves useful
- [ ] Email/SMS/push notifications — deferred until a delivery provider is chosen

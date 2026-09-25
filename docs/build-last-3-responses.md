# My Chata — what the last three builds added (25.09.2026)

Ticked items were checked after the build (typecheck, database, or test browser). Unticked items give the reason.

## 1. Growth plan build (analytics, accounts, onboarding, growth)

### Database

- [x] Profiles gained display name, photo, phone, and onboarding-completed date
- [x] Properties gained rooms, city, max guests for overlapping stays, busy seasons, and creator
- [x] Per-chata admins (`property_admins`): whoever adds a chata becomes its admin
- [x] Invitations with a secure accept function
- [x] Guest links and guest requests (book without an account)
- [x] Property photos, with only one main photo per chata
- [x] Saved onboarding answers, consent log, and organisation join requests
- [x] Manual text pieces for AI answers (vector search)
- [x] Account and chata creation functions (`create_account_onboarding`, `add_property`)

### Sign-in and accounts

- [x] Sign-in with Google, email + password, or magic link; password reset page
- [x] The institution path blocks public email providers (gmail, seznam…)
- [x] Invite page (`/pozvanka/…`) adds the invitee straight to the right account

### Onboarding

- [x] 5-step guided setup: account type → chatas (names, address, rooms) → people and seasons → overlap rules and guest limit → house rules
- [x] Several chatas can be named; the creator becomes admin of each
- [x] App sections stay locked until onboarding is finished

### Screens

- [x] My Profile (`/profil`)
- [x] Members & permissions, WhatsApp-style admin roles (`/clenove`)
- [x] Add a chata (`/chata/nova`)
- [x] Shared photo gallery with a main-photo choice (`/fotky`)
- [x] Privacy & cookies page (`/soukromi`)
- [x] Guest booking page, no login (`/host/…`), with guest-link creation under More and guest requests on Home
- [x] Settings cleaned up, Language moved to a collapsed row near the bottom
- [x] House manual Q&A with sources (answers from manual text only)
- [ ] House manual Q&A answering with the AI model — needs the AI key to be available in this environment; falls back to showing the original text

### Consent and analytics

- [x] Friendly cookie card: "Help us improve", "Essentials only", "Customise"
- [x] Choice saved for 12 months and logged for GDPR
- [x] Analytics helper with typed events and shared context (account type, language, number of chatas; never names or emails)

## 2. Google Analytics connector sync

- [x] Measurement ID G-6K9GYD9NSK confirmed synced from the Google Analytics connector
- [x] Tag loads with that ID in the test browser

## 3. Tag detection, region consent, onboarding gate (this build)

- [x] Google tag is now in the page head on every page, so Tag Assistant can always find it
- [x] Commands are sent to Google in the correct format (fixes skipped commands)
- [x] Consent defaults set before the tag loads: denied in EU/EEA/UK/CH, analytics granted elsewhere, ads always denied
- [x] `wait_for_update: 500`, and a saved choice is applied before the first hit
- [x] Consent banner shows only where it's required (EU/EEA/UK/CH, or when the country is unknown)
- [x] Onboarding is required for every first-time sign-in unless the person joined through an admin's invite link
- [x] Accepting an invite marks onboarding complete
- [x] Seeded members (Petra, Jaroslav, Tomáš, Jana, Aleš) marked complete; the Ranaji accounts will go through onboarding
- [x] People already in an account can finish onboarding without creating a duplicate account; their named chatas are added and they become admin
- [ ] Live check with Tag Assistant on mychata.cz — only possible after you publish

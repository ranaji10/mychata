# My Chata — Analytics, Accounts, Onboarding and Growth Plan

## Answers first (no build needed)

**GA4 status.** Google Analytics is linked to the project, but no tracking code runs on the site yet, so nothing is being recorded. Changes worth making in GA4 as the product grows:

- Set data retention to 14 months, turn on Google Signals only after cookie consent is live, and add `mychata.cz` plus `www` to the same web stream.
- Keep one property. Tell apart family, institution and guest traffic with custom dimensions, not separate properties.
- Mark `sign_up`, `booking_created`, `guest_booking_submitted` and `onboarding_completed` as key events.

**What Google sign-in shares.** The app receives your name, email address, profile photo link, and Google account ID. Nothing else (no Gmail, contacts or Drive). Only the sign-in service stores this. The site can read it for the signed-in person only. You can see every signed-up person under View Backend → Users.

**Chromium password error.** Right now only Google sign-in exists, so a password field probably belongs to Google's own screen or a browser autofill prompt. To pin down the problem, send: (1) a screenshot of the error, (2) the page address at that moment, (3) the time it happened, (4) the Console tab text from DevTools (right-click → Inspect → Console). Sign-in logs for the two newest accounts (checked 25.09.2026):

- **adrenaline.rush.1987@gmail.com**: name "Ranaji Deb", signed up with Google at 01:46:35 UTC, Google photo present, email confirmed. Every sign-in step succeeded with no errors. It is **not linked to any chata member and has no role**, which is why it shows "?".
- **ranaji.deb@gmail.com**: name "Ranaji Deb", signed up with Google at 01:44:28 UTC, Google photo present, email confirmed. Every sign-in step succeeded with no errors. It is also **not linked to a member and has no role**.
- The logs for the last 2 days show no failed sign-in attempts at all. The Chromium error therefore happened on Google's side or in the browser before it reached My Chata.

**iPhone photo and name missing (screenshot).** Sign-in worked, but the account is not linked to a family member. The app only links a new person automatically when their email matches a member, or when they are the first person ever to sign in. This person matched neither, so the page shows "?". Invitations (below) fix this. The profile photo and name from Google will also be shown directly. From now on, every new account (family, institution, or any future type) that isn't joining through an invitation is sent into onboarding first. Profile, Add chata, and every other section stay locked until onboarding is finished. Onboarding appears as a step-by-step "Get your chata ready for bookings" checklist:

1. Choose account type (Family / Institution)
2. Confirm your profile (name, photo)
3. Add your chata (name, address, rooms)
4. Set booking rules (overlaps, guest limit, busy seasons)
5. Add house rules
6. Add a main photo
7. Invite members (can be skipped)

Each step shows as done or to do. The app unlocks once the required steps (1–4) are done; the rest stay visible on the home screen until finished. People who join through an invitation skip straight to the account they were invited to. At the end of onboarding, the person names each of their chatas, and **whoever adds a chata automatically becomes that chata's admin** (other chatas can have their own admins later, WhatsApp-style). (Technical: an `onboarding_completed_at` column on profiles, a client-side gate in AppShell that redirects to `/onboarding` until it is set, and a `property_admins` table keyed per chata.)

## What gets built

### 1. Analytics that never slows the page

- Load Google's script only after consent, in the background (`async`, after the page appears), through one small analytics helper.
- Record page views automatically on every page change through a single router listener, so future pages are covered with no extra work.
- Standard event list with typed names: sign_up, login, onboarding_step, onboarding_completed, booking_created, booking_overlap_shown, task_created, task_done, expense_added, settlement_confirmed, handover_submitted, document_uploaded, photo_uploaded, guest_link_shared, guest_booking_submitted, invite_sent, language_changed.
- Shared context on every event: account type (family/institution/guest), language, number of properties. Never names, emails or free text.
- Holding queue ("data bucket"): events wait in memory until consent is known, then are sent in batches. Offline events are kept and sent on reconnect, capped at 200.
- Leave dead-letter logging and a BigQuery export as a later step for deeper analysis.

### 2. Cookie consent (GDPR)

- A friendly bottom card with a cottage illustration and three plain choices: "Just the essentials", "Help us improve (analytics)", "Customise". Accept and Reject get equal weight, as GDPR requires.
- Google Consent Mode v2: everything defaults to denied, and the choice is saved for 12 months and logged with its timestamp and version.
- New "Privacy & cookies" page listing each cookie, what it does and how long it lasts. A "Cookie settings" link in More lets people change their mind at any time.
- Only one optional category (analytics). Essential covers sign-in, language and the offline cache.

### 3. More sign-in options and institution sign-up

- Add email and password (with reset-password page) and email magic link alongside Google.
- Institution sign-up path: work email → confirm email → create an organisation. Anyone with a verified email on the same domain can ask to join, and an admin approves them. No family account is created.
- Public email domains (gmail, seznam, etc.) are blocked from the institution path.

### 4. Onboarding with guided questions

Runs once after first sign-in, or from More → "Add chata":

1. Family or Institution?
2. How many chatas? If more than one: same city or different cities?
3. About how many people use it?
4. Busy seasons? (summer / winter / holidays / none)
5. For each chata: name, address, number of rooms.
6. If more than 3 rooms: may members book the same dates? If yes: maximum guests before extra bookings need admin approval.

The answers set up the home screen (for example, a multi-chata switcher, seasonal reminders, and whether the overlap guest limit applies). A property switcher sits in the header when there is more than one chata.

### 5. My Profile

Photo and name (from Google, editable), email, phone, branch, language, notification preferences (stored for later), a "My bookings" shortcut, data export, sign out, and delete account.

### 6. Members and permissions (WhatsApp style)

- A Members page for admins: invite by link or email, see who is pending, make someone an admin or remove admin rights, and remove members. The last admin cannot be removed.
- House rules and the manual stay admin-only to edit.
- Invite links expire after 7 days and link the person to the right account automatically, which fixes the "?" problem.

### 7. Chata photos

Any member can upload photos to a shared gallery. Any member can set the main photo, which shows on the home screen and the public pages. Photos are compressed on upload, and whoever uploaded a photo (or an admin) can delete it.

### 8. Guest booking link (no account)

- A member creates a shareable link with an optional date range and expiry.
- The guest sees free and busy dates only (no names), fills in name, email or phone, dates and number of guests, and sends it.
- Family admins see the request and approve it. Links can be switched off at any time, and the form has spam protection.

### 9. Settings clean-up

Remove the language card and the second toggle from More. Put a collapsed "Language" row near the bottom, and keep the CZ/EN switch in the header.

### 10. Future search and recommendations (RAG), staged

- **Stage 1 (now):** Q&A over the house manual, house rules and documents for each chata. Content is split into chunks and stored with the `google/gemini-embedding-2` model in the database's built-in vector search. Retrieval is filtered by account, so private data never crosses accounts. Answers cite their sources.
- **Stage 2 (marketplace):** a combined search over public listings. It mixes keyword and vector search, adds filters (dates, capacity, region, price), ranks results with availability-aware reranking, and handles CZ/EN in the same index.
- **Stage 3 (scale):** move vectors to a dedicated index when listings pass about 1 million. Keep embeddings up to date through a background queue, and use event data from analytics to improve ranking.
- Guardrails for every stage: only public content gets indexed for the marketplace, and private data stays out of it.

## Order of work

1. Settings clean-up, profile photo/name fix, My Profile
2. Members and invites, permissions
3. Onboarding and add chata, property switcher
4. Email/password and institution sign-up
5. Cookie consent, then analytics
6. Photo gallery, then guest booking link
7. Stage 1 RAG (manual Q&A)
8. Update the Notion Build Log

## Technical details

- New tables (all with grants and RLS): `invitations`, `property_photos` (`is_primary`, one per property via a partial unique index), `guest_links`, `guest_requests`, `onboarding_answers`, `consent_log`, `org_domains`, `org_join_requests`, `manual_chunks` (vector). Add columns `properties.rooms`, `overlap_max_guests`, `peak_seasons`, `city`; `profiles.avatar_url`, `display_name`, `phone`.
- Roles stay in `user_roles` with `has_role`. Changing admin status goes through a security definer function that checks the caller is an admin and refuses to remove the last admin.
- Guest link submissions go through a public server route under `/api/public/guest-request`, with Zod validation, a token lookup and a honeypot field. Availability comes from a security definer function.
- Analytics: `src/lib/analytics.ts` (`track()`, queue, consent gate, Consent Mode v2), and a router `onResolved` subscription in `__root.tsx` for page views. The measurement ID comes from `VITE_LOVABLE_CONNECTOR_GOOGLE_ANALYTICS_API_KEY`.
- Email auth: enable email sign-in and turn on leaked-password protection.
- New routes: `/profil`, `/clenove`, `/onboarding`, `/chata/nova`, `/fotky`, `/soukromi`, `/reset-password`, `/pozvanka/$token`, `/host/$token` (public, `noindex`).

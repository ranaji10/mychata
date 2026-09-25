# Fix Google tag detection, region-scoped consent, onboarding gate, build doc

## 1. Why Tag Assistant finds no tag (to fix)

- The tag only loads after someone clicks "Help us improve". Tag Assistant opens a fresh browser with no choice made, so there is nothing to find.
- The small helper that sends data to Google stores each command as a plain list instead of the format Google's script expects. Some commands can be skipped because of this.
- The live site at mychata.cz may still run an older version. The consent banner and tag code only go live after publishing.

Fix:

- Put the Google tag in the page head on every page, with Consent Mode defaults set **before** the tag loads. Tag Assistant will always detect it. Before consent, Google gets only cookieless pings; nothing is stored.
- Send commands to Google in the correct format.
- Publish after the build, then check mychata.cz with Tag Assistant.

## 2. Region-scoped consent defaults (as you asked)

- **EU/EEA, UK, Switzerland:** analytics and ads default to "denied" until the visitor chooses in the banner.
- **Everywhere else:** analytics defaults to "granted" and the banner doesn't appear. Ads stay "denied" everywhere, because we run no ads.
- Region comes from the visitor's location header on the server, with the EU default as the fallback. The banner shows only where it's needed.
- Set `wait_for_update: 500` so an earlier saved choice is applied before the first hit is sent.
- We don't use Tag Manager containers or custom templates, so the "Tag Manager Consent API" note doesn't apply. The same guarantee comes from setting consent inline as the page starts, before the tag and before any event. This matches Google's recommended order for gtag.js. If a Tag Manager container is added later, we'll switch to a Consent-API template.

## 3. Publish the custom consent banner

- It's built but not confirmed live. Publish, then check on mychata.cz from an EU location (banner shows) and a non-EU location (no banner).

## 4. Onboarding for every first-time sign-in

Today someone skips onboarding if their account is linked to any member. Your account was linked by hand earlier, so you skipped it.

New rule:

- Onboarding is required unless the person's **profile is marked complete**, or they **joined through an admin's invite link**. Accepting an invite marks them complete.
- Existing seeded family members (Petra, Jaroslav, Tomáš, Jana, Aleš) are marked complete so they aren't interrupted. The two Ranaji accounts are **not** marked, so they go through onboarding next time they sign in.
- If someone is already in an account but not marked complete, onboarding skips "create account/chata" and asks the remaining questions: profile, booking rules, chata names. The person naming a chata becomes its admin.
- Finishing sets the completion date, then opens Home.

## 5. Build documentation

- Create `docs/build-last-3-responses.md`: a detailed list of what the last three responses built (growth plan build, GA connector sync, this fix). Each item is a checkbox.
- After this build, tick each item that was verified. Leave anything unverified unticked, with a reason.
- Also add a dated entry to the Notion Build Log.

## Technical details

- `__root.tsx` head: inline script sets up `dataLayer`, `function gtag(){dataLayer.push(arguments)}`, and region-scoped `gtag('consent','default',{..., region:[EU list]})` plus a global default. It also applies any saved choice from `mychata.consent`, then the async `gtag/js?id=` script and `config` with `send_page_view:false`.
- `analytics.ts`: uses the existing `window.gtag` and updates consent only.
- Region detection: a server function reads `cf-ipcountry`. `ConsentBanner` renders only for EEA/UK/CH or unknown.
- `account.tsx`: `needsOnboarding = user && !profile?.onboarding_completed_at`.
- Migration: set `onboarding_completed_at = now()` for profiles of seeded members. `accept_invitation` also sets it.
- `onboarding.tsx`: a branch for users who already have a member row (skips `create_account_onboarding`). Always updates `profiles.onboarding_completed_at`.

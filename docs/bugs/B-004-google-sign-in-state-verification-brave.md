# B-004 Google sign-in fails on Brave mobile: "State verification failed"

Reported: 2026-09-26 · Status: open, depends on T-002 or Lovable

Where: Brave mobile with Shields on. `oauth.lovable.app/callback` returns 400 `invalid_request`, "State verification failed".
Cause (likely): Google sign-in goes through Lovable's broker domain (`oauth.lovable.app`). Brave (and Safari's tracking prevention) partition or drop the cross-site state it stores before the redirect, so the broker can't match it on return.
Not in our code: `src/integrations/lovable/index.ts` is Lovable-generated.
Workarounds today: e-mail + password or e-mail link work on every browser.
Options:

1. Ask Lovable whether Cloud supports your own Google OAuth client with Supabase's direct flow (first-party redirect, PKCE).
2. As part of T-002, sign in with `supabase.auth.signInWithOAuth` directly.
   Test: sign in on Brave mobile with Shields default and aggressive.

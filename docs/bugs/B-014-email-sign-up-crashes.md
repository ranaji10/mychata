# B-014 Email sign-up and sign-in do nothing; only Google works

Reported: 2026-09-28 by maintainer review of mychata.cz · Status: fixed on branch `agent/claude/T-019-invites-signin-demo` (not yet live)
Where: mychata.cz/auth → E-mail a heslo → any email
Screenshot: none (network and console recordings in the workspace private/ folder)
Steps to reproduce: see Where.
Expected / actual: expected: account created / signed in. Actual: nothing happens and the button stays busy. `const fn = isSignUp ? supabase.auth.signUp : supabase.auth.signInWithPassword` detached the method from its client, so the call threw before any request (none appears in the 28 Sep network recording).
Test that reproduces it: manual check in the release list (needs a real mailbox)

Fix: Both calls are made on `supabase.auth` directly, errors are caught and explained (wrong password, email not confirmed, already registered, email rate limit, weak password), and a sign-up that returns a session goes straight on. Magic-link and confirmation emails still come from Lovable's default sender, which is rate-limited; the custom email domain (T-005) removes that limit.

# T-054 "MyChat" in translated e-mails

Owner: Claude (cloud session) · Status: review

Goal: mail apps that machine-translate the Czech e-mail (Apple Mail, Gmail, Outlook) no longer turn the brand "MyChata" into "MyChat".
Non-goals: wording of any e-mail; the sender name in the inbox list (set by the mail app's translation, outside our HTML); subjects.
Files allowed: `src/lib/email-templates/layout.tsx`, `src/lib/t054.test.ts` (new), `docs/STATUS.md`, this brief.
Invariants touched (AGENTS.md): 5 (no text changes).
Context: user report 3 Nov 2026: the sign-up e-mail for a new test account showed "MyChat" in the header, the sender and the first paragraph; the rendered text ("Thank you for registering in MyChata", "Confirm email · Confirm email") is a machine translation of the Czech lines, the source templates already say MyChata.

Acceptance:

- `bun run check` passes; `src/lib/t054.test.ts`: `<html>` and `<body>` carry `translate="no"`, `<meta name="google" content="notranslate">` is present, every visible "MyChata" in the sign-up, invitation, password and notification e-mails sits in `<span translate="no" class="notranslate">`.

Handoff note: the shared layout marks the whole e-mail as not to be translated (it is already bilingual) and wraps each "MyChata" via `keepBrand()`. Not verified: how each mail app honours `translate="no"` (Apple Mail and Gmail strip some `<html>`/`<body>` attributes, hence the per-word span); the sender name in the inbox list may still be translated by the mail app.

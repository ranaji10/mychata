# T-005 Transactional email

Status: decided 26 Sep, waiting on the DNS step · Owner: maintainers (steps 1–3), Lovable (L-E), Claude Code (notifications)

Decision: send through **Lovable's built-in email** ([docs](https://docs.lovable.dev/features/custom-emails)), from `MyChata <no-reply@notify.mychata.cz>` with Reply-To `podpora@mychata.cz`.
Why: included in paid Lovable workspaces (50,000 emails a month), no extra vendor account, API key or data-processing agreement, SPF/DKIM/DMARC handled for us, and it covers sign-in emails (confirm, reset, magic link) as well as app emails. Cost of the choice: one more Lovable dependency. Everything goes through one function, `src/lib/email.server.ts`, so Model B (T-002) swaps the provider (e.g. Brevo or Resend, EU region) in one file.
Goal: invitations sent by email; approvals, tags and handovers notify the right member; guest and institutional requesters get a confirmation and the decision; document expiry reminders later.

## Steps

1. **You:** confirm the "My Lovable" workspace is on a paid plan (custom sender domains are paid-only).
2. **You:** set up the inbox for replies, `podpora@mychata.cz` (usually free forwarding at the domain registrar to one of your own mailboxes).
3. **You:** in Lovable, project settings → Emails → add domain `mychata.cz`, sender subdomain `notify`. Lovable shows NS and TXT records: add them at the company where mychata.cz's DNS is managed. They only delegate `notify.mychata.cz`; the website and any existing email on mychata.cz are not affected. Verification takes hours, up to 72 h.
4. **Lovable, batch L-E** (`docs/external/claude/2026-09-26-review-prompts.md`): sign-in email templates in Czech and English, "Confirm email" on, one generic "notification" app template and its send function.
5. **Claude Code, CC-3:** notifications table and queue on top of that send function; invitation, approval, tag and handover emails.
6. **Check:** each email kind sent once to a maintainer's own address, never to real members; delivery logs in Lovable.

Rules: transactional only (no newsletters without consent and unsubscribe); Czech first; nothing personal in subject lines.

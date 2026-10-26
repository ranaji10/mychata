# T-046 Requests of 26 Oct 2026 (Enter submits, Help & support, back from Privacy, N-15, N-16)

Owner: Claude (cloud session) · Status: review

Goal: act on the maintainer's inputs of 26 Oct that need code or docs.

Non-goals: migrations (none needed), e-mail sending (N-5), pricing.

Invariants touched: 5 (all new text through `t()`, 44px targets), 6.

## Requests and what was done

| Input                                                                                                  | Done                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No way back or to close from the cookie section when a visitor opens "What we see" / the GA statistics | Privacy & cookies (`/soukromi`) shows Back for everyone: back in history when there is a page to return to, otherwise Settings (signed in) or sign-in. The banner's "Co z nich vidíme" is a router link, so Back returns to where the visitor was. A banner reopened with "Změnit nastavení cookies" has a close (X) that keeps the earlier choice, and the page shows that choice meanwhile |
| Enter on the sign-in / sign-up page should submit                                                      | Sign-in, sign-up and institution sign-up, Forgot password, and the password form (reset link, onboarding, My profile) are forms: Enter submits when the button would. Only the submit button sits inside each form                                                                                                                                                                           |
| Add Help & Support in Settings                                                                         | New page `/pomoc` "Nápověda a podpora": five common questions (invite, book, forgotten password, public calendar off, who sees my data), `podpora@mychata.cz`, "Nahlásit problém" (mailto with app version and browser only), version line. Row in Settings above Privacy & cookies and in the desktop sidebar                                                                               |
| N-15: content is good                                                                                  | `docs/content/house-rules-cs-en.md`, `docs/content/manual-questions-cs-en.md` (with the "Why we ask" hints), `docs/content/README.md`; the draft is marked approved. L-3 reads them                                                                                                                                                                                                          |
| Found in the 26 Oct two-person check (N-14)                                                            | Home's request card shows the requester's note; before, admins saw it only on the stay after approving                                                                                                                                                                                                                                                                                       |
| N-9: test account labels in Lovable's Knowledge                                                        | Rule 16 in `docs/external/lovable/KNOWLEDGE.md` (pasted into Lovable's project Knowledge the same day)                                                                                                                                                                                                                                                                                       |
| N-16: ADR-0012 approved                                                                                | ADR-0012 accepted. `manual.tsx` and `chaty.tsx` no longer call `rebuildManualChunks`; `askManual` logs `[askManual] context size` (characters, sources, sent, over budget; no text). `rag.md` updated                                                                                                                                                                                        |

## Acceptance

- `bun run check` passes; `src/lib/t046.test.ts` pins the above.
- A fresh review found nothing serious; its four smaller findings are fixed (FAQ wording for invites and booking, `truncated` in the context-size log, the banner reopens on its short view).
- Checked in a local dev server (iPhone 13 emulation): banner link → Privacy → Back returns to `/auth`; Enter in the password field sends the sign-in request; the reopened banner's X closes it.

## Not verified

- `/pomoc` rendered signed in (the dev server has no test sign-in); check it after publish.
- Whether `podpora@mychata.cz` receives mail (T-005 step 2 is the maintainer's).

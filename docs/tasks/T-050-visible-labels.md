# T-050 Visible labels on form fields (D-32)

Owner: Claude (cloud session) · Status: review

Goal: D-32 (approved 26 Oct, "do it in code"): every field says what it is above it, and a grey "Vytvořit účet" says what is still missing.
Non-goals: no new styles (uses `label-text`, as the public request form already does), no change to what the forms send, no migration.
Files allowed: `src/routes/auth.tsx`, `src/routes/reset-password.tsx`, `src/routes/host.$token.tsx`, `src/components/PublicBookingRequest.tsx`, `src/routes/chata.nova.tsx`, `src/routes/onboarding.tsx`, `src/components/CottageSetup.tsx`, `src/components/InstitutionSetup.tsx`, `src/routes/manual.tsx`, `src/routes/dokumenty.tsx`, `src/routes/chaty.tsx`, `src/lib/t049.test.ts`, `src/lib/t050.test.ts` (new), docs.
Invariants touched (AGENTS.md): 5.

## Done

- Sign-in, sign-up, institution sign-up, reset password, guest booking, public request note, add cottage, onboarding (cottage name, address, city, rooms, people, overlap limit), cottage and institution setup, manual sections (category, Czech and English title and content, who sees it), documents (title, category, notes, who sees it), house rules: a 15px bold label above each field (`<label><span class="label-text">…`). Placeholders that only repeated the label are gone; the rest are examples ("např. jana@seznam.cz", "alespoň 8 znaků", "Např. 8").
- Sign-up and sign-in: once someone has typed anything, a line under a grey button lists what is missing ("Ještě doplňte: e-mail, heslo").
- Onboarding step 1's name field had a label already; the hidden name added in T-049 is removed there (it overrode "Vaše jméno").
- `t050.test.ts` fails when a text field, textarea or select in these 11 files has neither a label nor `aria-label`/`id`, or when labels nest.

## Acceptance

- `bun run check` passes (296 tests).
- Local production build, iPhone 13 viewport: e-mail sign-up, institution sign-up and reset password show the labels; typing a name shows "Ještě doplňte: e-mail, heslo".

## Not verified

- Signed-in forms (add cottage, onboarding, manual, documents, house rules) in a browser: no test sign-in in the local build. Check after publish.

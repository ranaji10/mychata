// O-32 (T-066): forms say in plain words what the server would refuse, before sending.
// The server checks the same inputs with zod (`src/lib/input-schemas.ts`); zod is kept out of
// the browser bundle, so the rules are repeated here and `t066.test.ts` holds both to the same
// samples. A refusal that still reaches the browser is a ZodError whose message is raw JSON:
// `serverErrorText` turns that into a sentence.

/** zod 4's `z.email()` pattern, copied; the test compares it with zod's own. */
// Kept byte for byte as zod writes it (its escapes included), so the comparison stays exact.
/* eslint-disable no-useless-escape */
export const EMAIL_PATTERN =
  /^(?:[A-Za-z0-9_'+\-]+\.)*[A-Za-z0-9_'+\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;
/* eslint-enable no-useless-escape */

export const GUEST_LIMITS = { name: 120, email: 200, note: 1000, guests: 50 } as const;
export const QUESTION_MAX = 500;

export type GuestRequestProblem = "name" | "email" | "guests" | "note";

/** What the guest request form must fix before sending, or null. Inputs are sent trimmed. */
export function guestRequestProblem(input: {
  name: string;
  email: string;
  guests: number;
  note: string;
}): GuestRequestProblem | null {
  const name = input.name.trim();
  if (name.length < 2 || name.length > GUEST_LIMITS.name) return "name";
  const email = input.email.trim();
  if (email.length > GUEST_LIMITS.email || !EMAIL_PATTERN.test(email)) return "email";
  if (!Number.isInteger(input.guests) || input.guests < 1 || input.guests > GUEST_LIMITS.guests)
    return "guests";
  if (input.note.length > GUEST_LIMITS.note) return "note";
  return null;
}

/** True for a refused server-function input (a ZodError: its message is a JSON issue list). */
export function isInputRefusal(error: unknown): boolean {
  const message = (error as { message?: unknown } | null)?.message;
  if (typeof message !== "string" || !message.trimStart().startsWith("[")) return false;
  try {
    const issues: unknown = JSON.parse(message);
    return (
      Array.isArray(issues) &&
      issues.length > 0 &&
      issues.every((i) => typeof i === "object" && i !== null && "code" in i && "path" in i)
    );
  } catch {
    return false;
  }
}

type T = (cs: string, en: string) => string;

/** A failed server call in plain words: never raw JSON. */
export function serverErrorText(error: unknown, t: T): string {
  if (isInputRefusal(error))
    return t(
      "Něco ve formuláři neodpovídá (třeba příliš dlouhý text). Upravte to a zkuste znovu.",
      "Something in the form doesn't fit (for example, text that is too long). Adjust it and try again.",
    );
  const message = (error as { message?: unknown } | null)?.message;
  return typeof message === "string" && message ? message : String(error);
}

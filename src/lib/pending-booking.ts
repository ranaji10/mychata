// "Request a booking" on a public calendar (T-043): a visitor who has to sign up first must
// land back on the same calendar afterwards, including after Google's redirect and the
// confirmation email. The token is kept in localStorage for a day (like pending-invite.ts);
// email sign-ups also carry it in the account's metadata, for a confirmation link opened in
// another browser.

const KEY = "mychata.pending-calendar";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
/** Name of the sign-up metadata field (supabase.auth.signUp options.data). */
export const RETURN_CALENDAR_META = "return_calendar";

export function savePendingCalendar(token: string): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ token, at: Date.now() }));
  } catch {
    /* private mode: the visitor opens the link again after signing in */
  }
}

/** The saved calendar token, if one is waiting and not older than a day. */
export function pendingCalendar(now = Date.now()): string | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const { token, at } = JSON.parse(raw) as { token?: unknown; at?: unknown };
    if (typeof token !== "string" || typeof at !== "number" || now - at > MAX_AGE_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    return token;
  } catch {
    return null;
  }
}

export function clearPendingCalendar(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/**
 * A calendar token from the account's sign-up metadata, only for an account created in the
 * last two days (so an old sign-up never redirects again). Pure, tested in t043.test.ts.
 */
export function calendarFromMetadata(
  meta: Record<string, unknown> | null | undefined,
  createdAt: string | null | undefined,
  now = Date.now(),
): string | null {
  const token = meta?.[RETURN_CALENDAR_META];
  if (typeof token !== "string" || token.length < 8 || token.length > 128) return null;
  const created = createdAt ? new Date(createdAt).getTime() : NaN;
  if (Number.isNaN(created) || now - created > 2 * MAX_AGE_MS) return null;
  return token;
}

export type PublicRequestResult =
  | "ok"
  | "sign_in"
  | "link"
  | "unconfirmed"
  | "member"
  | "dates"
  | "guests"
  | "busy"
  | "rate"
  | "duplicate"
  | "disabled";

/** What the page says for each answer of request_public_booking (migration 0034). */
export function publicRequestMessage(result: string): [cs: string, en: string] {
  switch (result as PublicRequestResult) {
    case "ok":
      return [
        "Žádost odešla správcům chaty. Jakmile ji vyřídí, uvidíte to tady.",
        "Your request went to the cottage's admins. You will see their decision here.",
      ];
    case "sign_in":
      return ["Nejdřív se přihlaste.", "Please sign in first."];
    case "unconfirmed":
      return [
        "Nejdřív potvrďte svůj e-mail odkazem, který jsme vám poslali.",
        "Please confirm your email first, using the link we sent you.",
      ];
    case "member":
      return [
        "Jste členem této chaty: termín si zarezervujte přímo v aplikaci.",
        "You are a member of this cottage: book the dates in the app.",
      ];
    case "dates":
      return [
        "Zkontrolujte termín: odjezd musí být po příjezdu a příjezd ne v minulosti.",
        "Check the dates: departure must be after arrival, and not in the past.",
      ];
    case "guests":
      return ["Zkontrolujte počet hostů.", "Check the number of guests."];
    case "busy":
      return [
        "V tomto termínu už je chata obsazená. Vyberte jiné dny.",
        "The cottage is already booked for these dates. Pick other days.",
      ];
    case "rate":
      return [
        "Dnes už jste poslali hodně žádostí. Zkuste to zítra.",
        "You have sent many requests today. Please try again tomorrow.",
      ];
    case "duplicate":
      return [
        "Žádost na tento termín už čeká na správce.",
        "A request for these dates is already waiting for the admins.",
      ];
    case "disabled":
      return [
        "Žádosti o pobyt jsou teď vypnuté. Zkuste to později, nebo se zeptejte správce chaty.",
        "Booking requests are switched off right now. Try later, or ask the cottage's admin.",
      ];
    case "link":
    default:
      return [
        "Tento kalendář teď nepřijímá žádosti. Zeptejte se správce chaty.",
        "This calendar isn't taking requests right now. Ask the cottage's admin.",
      ];
  }
}

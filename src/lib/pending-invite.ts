// An invitation link opened before signing in must survive the trip through /auth,
// including Google's redirect, so the token is kept in localStorage until it is used (B-013).

const KEY = "mychata.pending-invite";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function savePendingInvite(token: string): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ token, at: Date.now() }));
  } catch {
    /* private mode: the person opens the link again after signing in */
  }
}

/** The saved invitation token, if one is waiting and not older than a day. */
export function pendingInvite(now = Date.now()): string | null {
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

export function clearPendingInvite(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export type InviteErrorKind =
  "not_found" | "expired" | "used" | "email_mismatch" | "sign_in" | "unknown";

/** Maps the database's error text (migration 0020) to what the page explains. */
export function inviteErrorKind(message: string | undefined | null): InviteErrorKind {
  const m = message ?? "";
  if (m.includes("invitation_email_mismatch")) return "email_mismatch";
  if (m.includes("invitation_expired")) return "expired";
  if (m.includes("invitation_used")) return "used";
  if (m.includes("invitation_not_found")) return "not_found";
  if (m.includes("invitation_sign_in_required")) return "sign_in";
  return "unknown";
}

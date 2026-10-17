// Bug 5 (17 Oct 2026): someone signed in with a personal email who wants an institution's
// cottage. An institution needs its own work-email sign-in, so they sign up again with that
// email; afterwards the institution invites their personal email as an admin, so both
// accounts show up in the cottage switcher of one sign-in (bug 2's scenario).

const KEY = "mychata.link-personal-email";

// Tied to the work email the person typed, and kept for one day only: in a shared browser
// someone else's institution sign-up must never invite this personal email (PR #46 review).
const MAX_AGE = 24 * 3600 * 1000;

export function rememberPersonalEmail(email: string, workEmail: string) {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        email: email.trim().toLowerCase(),
        work: workEmail.trim().toLowerCase(),
        at: Date.now(),
      }),
    );
  } catch {
    /* private mode: the person can invite themselves from Members instead */
  }
}

/**
 * The personal email to invite: only when it was saved in the last day for exactly this work
 * email (`self`, the address now signed in), and isn't `self`.
 */
export function personalEmailToLink(self: string | null | undefined): string | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const { email, work, at } = JSON.parse(raw) as { email?: string; work?: string; at?: number };
    const me = (self ?? "").trim().toLowerCase();
    if (!email || !work || !at || Date.now() - at > MAX_AGE) return null;
    if (!me || work !== me || email === me) return null;
    return email;
  } catch {
    return null;
  }
}

export function forgetPersonalEmail() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

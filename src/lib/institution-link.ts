// Bug 5 (17 Oct 2026): someone signed in with a personal email who wants an institution's
// cottage. An institution needs its own work-email sign-in, so they sign up again with that
// email; afterwards the institution invites their personal email as an admin, so both
// accounts show up in the cottage switcher of one sign-in (bug 2's scenario).

const KEY = "mychata.link-personal-email";

export function rememberPersonalEmail(email: string) {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({ email: email.trim().toLowerCase(), at: Date.now() }),
    );
  } catch {
    /* private mode: the person can invite themselves from Members instead */
  }
}

/** The personal email to invite, if one was saved in the last 7 days and isn't `self`. */
export function personalEmailToLink(self: string | null | undefined): string | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const { email, at } = JSON.parse(raw) as { email?: string; at?: number };
    if (!email || !at || Date.now() - at > 7 * 24 * 3600 * 1000) return null;
    if (email === (self ?? "").trim().toLowerCase()) return null;
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

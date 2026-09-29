// Shared by the sign-in page and onboarding.

/** Public mailboxes: an institution must sign up with its own domain. */
export const PUBLIC_EMAIL_DOMAINS = [
  "gmail.com",
  "googlemail.com",
  "seznam.cz",
  "centrum.cz",
  "email.cz",
  "atlas.cz",
  "volny.cz",
  "post.cz",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "yahoo.com",
  "icloud.com",
  "me.com",
  "proton.me",
  "protonmail.com",
];

export function emailDomain(email: string): string {
  return email.trim().toLowerCase().split("@")[1] ?? "";
}

export function isPublicEmailDomain(email: string): boolean {
  return PUBLIC_EMAIL_DOMAINS.includes(emailDomain(email));
}

/** What the person told us when signing up (stored in the auth user's metadata). */
export interface SignupMetadata {
  fullName: string | null;
  kind: "personal" | "institution" | null;
  organisation: string | null;
}

export function signupMetadata(meta: Record<string, unknown> | undefined | null): SignupMetadata {
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const kind = meta?.["signup_kind"];
  return {
    fullName: str(meta?.["full_name"]) ?? str(meta?.["name"]),
    kind: kind === "institution" || kind === "personal" ? kind : null,
    organisation: str(meta?.["organisation"]),
  };
}

/** The error Supabase puts in the address when an email link was already used or expired. */
export function authLinkError(hash: string): "expired" | "other" | null {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const code = params.get("error_code");
  if (!params.get("error") && !code) return null;
  return code === "otp_expired" ? "expired" : "other";
}

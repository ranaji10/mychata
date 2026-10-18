// Passwords for people who signed up with Google (bug 4a) and the reset-password link (bug 4).
import type { User } from "@supabase/supabase-js";

/**
 * True when the person can sign in with email + password. Google sign-ups have no password
 * until they set one; Supabase doesn't add an "email" identity when a password is set later,
 * so the profile also records it in the user's metadata (`password_set`).
 */
export function hasPassword(
  user: Pick<User, "identities" | "app_metadata" | "user_metadata"> | null,
) {
  if (!user) return false;
  if (user.user_metadata?.["password_set"] === true) return true;
  if (user.identities?.some((i) => i.provider === "email")) return true;
  const providers = user.app_metadata?.["providers"];
  return Array.isArray(providers) && providers.includes("email");
}

/** Supabase refused because the current password is missing or wrong (bug 15). */
export function needsCurrentPassword(error: { message?: string; code?: string } | null) {
  if (!error) return false;
  const code = error.code ?? "";
  const m = (error.message ?? "").toLowerCase();
  return (
    code === "current_password_required" ||
    code === "current_password_mismatch" ||
    m.includes("current password")
  );
}

/** Friendly text for Supabase's password errors. */
export function explainPasswordError(message: string, t: (cs: string, en: string) => string) {
  const m = message.toLowerCase();
  if (m.includes("current password") && m.includes("required"))
    return t(
      "Pro změnu hesla zadejte i své současné heslo.",
      "To change your password, also enter your current password.",
    );
  if (m.includes("current password"))
    return t(
      "Současné heslo nesouhlasí. Zkuste ho zadat znovu.",
      "The current password is not right. Please type it again.",
    );
  if (m.includes("known to be weak") || m.includes("pwned"))
    return t(
      "Toto heslo se objevilo v únicích dat. Zvolte jiné.",
      "This password has appeared in data leaks. Please choose another one.",
    );
  if (m.includes("should be different") || m.includes("same password"))
    return t(
      "Nové heslo musí být jiné než staré.",
      "The new password must differ from the old one.",
    );
  if (m.includes("reauthentication") || m.includes("nonce"))
    return t(
      "Z bezpečnostních důvodů se nejdřív odhlaste a přihlaste znovu, pak heslo změňte.",
      "For security, sign out and back in first, then change the password.",
    );
  if (
    m.includes("password") &&
    (m.includes("at least") || m.includes("weak") || m.includes("characters"))
  )
    return t(
      "Heslo je příliš slabé (alespoň 8 znaků).",
      "Password too weak (at least 8 characters).",
    );
  return t(`Heslo se nepodařilo uložit: ${message}`, `Could not save the password: ${message}`);
}

const RECOVERY_KEY = "mychata.password-recovery";

/**
 * The reset link signs the person in and lands on /auth with `type=recovery` in the address.
 * Supabase reads and clears that address a moment later, and /auth used to forward everyone
 * to Home or onboarding before they could choose a new password (bug 4). Read it as early as
 * possible (this module loads with the app) and remember it for this tab.
 */
export function captureRecoveryFromUrl(href: string): boolean {
  const url = new URL(href);
  const params = new URLSearchParams(url.hash.replace(/^#/, ""));
  return params.get("type") === "recovery" || url.searchParams.get("type") === "recovery";
}

export function markRecovery() {
  try {
    sessionStorage.setItem(RECOVERY_KEY, String(Date.now()));
  } catch {
    /* private mode: the PASSWORD_RECOVERY event still covers this page load */
  }
}

/** A recovery started in the last 30 minutes in this tab. */
export function recoveryPending(): boolean {
  try {
    const at = Number(sessionStorage.getItem(RECOVERY_KEY) ?? 0);
    return at > 0 && Date.now() - at < 30 * 60 * 1000;
  } catch {
    return false;
  }
}

export function clearRecovery() {
  try {
    sessionStorage.removeItem(RECOVERY_KEY);
  } catch {
    /* ignore */
  }
}

if (typeof window !== "undefined" && captureRecoveryFromUrl(window.location.href)) markRecovery();

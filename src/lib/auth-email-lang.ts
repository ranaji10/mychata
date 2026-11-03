// Which language a sign-in e-mail (confirm, reset, magic link, …) goes out in (T-057).
// 1. The app adds ?lang=cs|en to the address the link returns to (sign-up, resend, reset), so the
//    language on screen at that moment wins; Supabase carries it in the link's redirect_to.
// 2. Otherwise the person's stored choice (profiles.preferred_lang, or "lang" given at sign-up),
//    looked up by address with the service role.
// 3. Otherwise Czech.
export type AuthEmailLang = "cs" | "en";

function langParam(url: string | null | undefined): AuthEmailLang | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const direct = u.searchParams.get("lang");
    if (direct === "cs" || direct === "en") return direct;
    for (const key of ["redirect_to", "redirectTo", "next"]) {
      const inner = u.searchParams.get(key);
      if (inner) {
        const found = langParam(inner);
        if (found) return found;
      }
    }
  } catch {
    return null;
  }
  return null;
}

export function langFromLinks(...urls: (string | null | undefined)[]): AuthEmailLang | null {
  for (const url of urls) {
    const l = langParam(url);
    if (l) return l;
  }
  return null;
}

export async function authEmailLang(data: {
  email: string;
  url?: string | null;
  callback_url?: string | undefined;
  site_url?: string | null;
}): Promise<AuthEmailLang> {
  const fromLink = langFromLinks(data.url, data.callback_url);
  if (fromLink) return fromLink;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: stored, error } = await supabaseAdmin.rpc("email_lang", { _email: data.email });
    if (error) throw error;
    if (stored === "en" || stored === "cs") return stored;
  } catch (e) {
    // The e-mail still goes out, in Czech; a failed lookup must not block signing in.
    console.error("[auth-email] language lookup failed", e);
  }
  return "cs";
}

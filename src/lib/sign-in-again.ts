import { supabase } from "@/integrations/supabase/client";

/**
 * "Přihlásit se znovu" for a screen that waits too long (T-051, T-052): clears this browser's
 * saved session and offline copy, signs out locally and opens sign-in.
 */
export async function signInAgain(where: string): Promise<void> {
  // Clear the saved session first: if it is what hangs, signOut() can hang on it too.
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("sb-") && key.includes("auth-token")) localStorage.removeItem(key);
    }
    // The offline copy of the last person's cottage data: signOut's own clean-up may not run.
    localStorage.removeItem("mychata.offline-cache");
  } catch {
    /* storage blocked: the sign-out below is all we can do */
  }
  const result = await Promise.race([
    supabase.auth.signOut({ scope: "local" }),
    new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 3000)),
  ]);
  if (result === null) console.error(`[${where}] sign out did not answer in 3 s`);
  else if (result.error) console.error(`[${where}] sign out`, result.error.message);
  window.location.assign("/auth");
}

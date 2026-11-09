import { supabase } from "@/integrations/supabase/client";

/** The two auth calls this needs; `supabase.auth` in the app, a fake in tests. */
export interface SignOutAuth {
  signOut(options?: {
    scope?: "global" | "local" | "others";
  }): Promise<{ error: { message: string } | null }>;
  getSession(): Promise<{ data: { session: unknown } }>;
}

/**
 * "Odhlásit se" (T-068). Signs out every device; if the server cannot be reached or answers
 * with an error, still signs out this device. From supabase-js 2.119 a failed global sign-out
 * keeps the session in the browser (2.118 removed it), so without the fallback the button
 * would open sign-in while the person stays signed in.
 * Returns an error only when this browser still holds a session afterwards.
 */
export async function signOutHere(
  where: string,
  auth: SignOutAuth = supabase.auth,
): Promise<{ error: { message: string } | null }> {
  const global = await auth.signOut();
  if (!global.error) return { error: null };
  console.error(`[${where}] sign out on the server`, global.error.message);
  // `local` removes this browser's session before it asks the server anything.
  // From 2.119 a local sign-out rethrows an error thrown by a SIGNED_OUT listener, after it
  // has removed the session (T-069): treat it like a returned error, then check the session.
  let local: { error: { message: string } | null };
  try {
    local = await auth.signOut({ scope: "local" });
  } catch (thrown) {
    local = { error: { message: thrown instanceof Error ? thrown.message : String(thrown) } };
  }
  if (local.error) console.error(`[${where}] sign out on this device`, local.error.message);
  const { data } = await auth.getSession();
  if (data.session) return { error: local.error ?? global.error };
  return { error: null };
}

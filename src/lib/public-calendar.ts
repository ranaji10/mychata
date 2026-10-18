import { supabase } from "@/integrations/supabase/client";

/**
 * The calendar link a plain member may pass on: read fresh from the database, because the
 * account's cached copy can still say "published" after an admin switched it off (PR #52
 * review). Null when it is off; throws on a read error.
 */
export async function publishedCalendarToken(propertyId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("properties")
    .select("public_token, public_calendar_enabled")
    .eq("id", propertyId)
    .maybeSingle();
  if (error) throw error;
  return data?.public_calendar_enabled ? data.public_token : null;
}

// Every cottage of every account the person belongs to (bugs 9 and 16, 18 Oct 2026).
// Row-level security shows `properties` of the open account only, so the switcher listed the
// open account's cottages but a single "Switch to …" for every other account. The database
// function my_cottages() (migration 0030) returns the person's cottages in all their accounts.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MyCottage {
  account_id: string;
  property_id: string;
  name: string;
  city: string | null;
}

/** PostgREST's answer when the function is not in the database yet (migration not applied). */
export function isMissingFunction(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return (
    error.code === "PGRST202" ||
    error.code === "42883" ||
    /could not find the function/i.test(error.message ?? "")
  );
}

/**
 * The person's cottages grouped by account. `null` while the database doesn't have
 * my_cottages() yet: callers then fall back to the open account's cottages only.
 */
export function useMyCottages(userId: string | undefined) {
  return useQuery({
    queryKey: ["my-cottages", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Record<string, MyCottage[]> | null> => {
      const { data, error } = await supabase.rpc("my_cottages");
      if (error) {
        if (isMissingFunction(error)) return null;
        throw error;
      }
      return groupByAccount(data ?? []);
    },
  });
}

export function groupByAccount(rows: MyCottage[]): Record<string, MyCottage[]> {
  const out: Record<string, MyCottage[]> = {};
  for (const row of rows) (out[row.account_id] ??= []).push(row);
  return out;
}

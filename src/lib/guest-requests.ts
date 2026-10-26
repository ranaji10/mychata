import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** How often lists that wait on another person's decision refresh while visible (F-25). */
export const LIVE_REFRESH_MS = 30_000;

/**
 * Guest requests waiting for an admin's decision (from the guest link, T-021).
 * Home lists them with Approve/Decline; the Calendar draws them as "Awaiting approval"
 * (T-026). One hook, so both pages share one cache entry with one shape.
 */
export function usePendingGuestRequests(propertyId: string | undefined, isAdmin: boolean) {
  return useQuery({
    queryKey: ["guest-requests", propertyId],
    enabled: !!propertyId && isAdmin,
    // A new request should reach the admin without a reload (F-25, 26 Oct): fresh on every
    // visit and every 30 s while the tab is in front.
    staleTime: 0,
    refetchInterval: LIVE_REFRESH_MS,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guest_requests")
        .select("*")
        .eq("property_id", propertyId!)
        .eq("status", "PENDING")
        .order("start_date");
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Requests an admin decided in the last two weeks (T-043): Notifications says who approved or
 * declined each one, so the other admins know it is handled.
 */
export function useRecentlyDecidedGuestRequests(propertyId: string | undefined, isAdmin: boolean) {
  return useQuery({
    queryKey: ["guest-requests-decided", propertyId],
    enabled: !!propertyId && isAdmin,
    queryFn: async () => {
      const since = new Date(Date.now() - 14 * 86400000).toISOString();
      const { data, error } = await supabase
        .from("guest_requests")
        .select(
          "id, guest_name, start_date, end_date, status, source, decided_at, decided_by_member_id",
        )
        .eq("property_id", propertyId!)
        .neq("status", "PENDING")
        .gte("decided_at", since)
        .order("decided_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

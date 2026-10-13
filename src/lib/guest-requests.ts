import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Guest requests waiting for an admin's decision (from the guest link, T-021).
 * Home lists them with Approve/Decline; the Calendar draws them as "Awaiting approval"
 * (T-026). One hook, so both pages share one cache entry with one shape.
 */
export function usePendingGuestRequests(propertyId: string | undefined, isAdmin: boolean) {
  return useQuery({
    queryKey: ["guest-requests", propertyId],
    enabled: !!propertyId && isAdmin,
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

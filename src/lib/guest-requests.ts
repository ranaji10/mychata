import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** How often lists that wait on another person's decision refresh while visible (F-25). */
export const LIVE_REFRESH_MS = 30_000;

/**
 * Guest requests waiting for an admin's decision (from the guest link, T-021).
 * Home lists them with Approve/Decline (only Decline once their dates passed, O-27); the
 * Calendar draws them as "Awaiting approval" (grey "Not decided" once their dates passed)
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
 * The most recently decided public requests, for the "Processed" list on a family's Requests
 * page (T-070). Under the same key prefix as the two-week list below, so a decision refreshes
 * both.
 */
export function useDecidedGuestRequests(
  propertyId: string | undefined,
  isAdmin: boolean,
  limit = 20,
) {
  return useQuery({
    queryKey: ["guest-requests-decided", propertyId, "latest", limit],
    enabled: !!propertyId && isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guest_requests")
        .select("id, guest_name, start_date, end_date, status, source, decided_at, created_at")
        .eq("property_id", propertyId!)
        .neq("status", "PENDING")
        .order("decided_at", { ascending: false, nullsFirst: false })
        .limit(limit);
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

/** One row of a family's "Processed" list (T-070). */
export interface ProcessedRequest {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: "APPROVED" | "DECLINED";
  origin: "public_calendar" | "guest_link" | "member";
  decidedAt: string | null;
  /** Members' stays open their stay page; public requests have no page of their own. */
  bookingId?: string;
}

/**
 * A family's decided requests, newest decision first (T-070): public requests an admin decided,
 * and members' held stays an admin approved. Declined members' stays are deleted on the stay page,
 * so they can't be listed. A public request approved creates a booking without a member, so it is
 * listed once, as the request.
 */
export function familyProcessed(
  decidedGuests: {
    id: string;
    guest_name: string;
    start_date: string;
    end_date: string;
    status: string;
    source?: string | null;
    decided_at: string | null;
  }[],
  bookings: {
    id: string;
    requester_name: string;
    requester_member_id: string | null;
    start_date: string;
    end_date: string;
    status: string;
    auto_approved?: boolean;
    approved_at?: string | null;
  }[],
  limit = 20,
): ProcessedRequest[] {
  const rows: ProcessedRequest[] = [
    ...decidedGuests
      .filter((g) => g.status === "APPROVED" || g.status === "DECLINED")
      .map((g) => ({
        id: `guest:${g.id}`,
        name: g.guest_name,
        start_date: g.start_date,
        end_date: g.end_date,
        status: g.status as "APPROVED" | "DECLINED",
        origin: (g.source === "public_calendar" ? "public_calendar" : "guest_link") as
          "public_calendar" | "guest_link",
        decidedAt: g.decided_at,
      })),
    ...bookings
      .filter(
        (b) =>
          b.status === "CONFIRMED" &&
          !!b.requester_member_id &&
          !b.auto_approved &&
          !!b.approved_at,
      )
      .map((b) => ({
        id: `booking:${b.id}`,
        name: b.requester_name,
        start_date: b.start_date,
        end_date: b.end_date,
        status: "APPROVED" as const,
        origin: "member" as const,
        decidedAt: b.approved_at ?? null,
        bookingId: b.id,
      })),
  ];
  return rows.sort((a, b) => (b.decidedAt ?? "").localeCompare(a.decidedAt ?? "")).slice(0, limit);
}

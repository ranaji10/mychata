// The hooks behind Notifications (bug 5); the list itself is built in notification-list.ts.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/account";
import type { Booking, InstitutionalRequest, Task } from "@/lib/data";
import { useExpenseData } from "@/lib/expenses";
import { usePendingGuestRequests } from "@/lib/guest-requests";
import { isMissingFunction } from "@/lib/my-cottages";
import { buildNotifications, type PendingInvitation } from "@/lib/notification-list";

export type { AppNotification, NotificationKind } from "@/lib/notification-list";

const SEEN_KEY = "mychata.notifications-seen";

/** Keys the person has already seen (opened the Notifications page while they were listed). */
export function readSeen(userId: string | undefined): Set<string> {
  if (!userId) return new Set();
  try {
    const raw = localStorage.getItem(`${SEEN_KEY}.${userId}`);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function markSeen(userId: string | undefined, keys: string[]) {
  if (!userId) return;
  try {
    // Only current keys are kept, so the list never grows without bound.
    localStorage.setItem(`${SEEN_KEY}.${userId}`, JSON.stringify(keys));
    window.dispatchEvent(new Event("mychata:notifications-seen"));
  } catch {
    /* private mode: the badge just stays until the items go away */
  }
}

/** Everything the Notifications page and the tab badge need, from shared query caches. */
export function useNotifications() {
  const { user, account, property, currentMember, members, profile } = useAccount();
  const isAdmin = currentMember?.role === "ADMIN" || currentMember?.role === "OWNER";
  const isFamily = account?.type === "FAMILY";
  const pid = property?.id;

  const invitations = useQuery({
    queryKey: ["my-invitations", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("my_invitations");
      if (error) {
        if (isMissingFunction(error)) return [] as PendingInvitation[];
        throw error;
      }
      return (data ?? []) as PendingInvitation[];
    },
  });
  // Same keys and shapes as Home, Calendar, Tasks and Documents, so they share one cache.
  const bookings = useQuery({
    queryKey: ["bookings", pid],
    enabled: !!pid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("property_id", pid!)
        .order("start_date");
      if (error) throw error;
      return data as Booking[];
    },
  });
  const tasks = useQuery({
    queryKey: ["tasks", pid],
    enabled: !!pid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("property_id", pid!)
        .order("due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data as Task[];
    },
  });
  const requests = useQuery({
    queryKey: ["requests", pid],
    staleTime: 0,
    enabled: !!pid && !isFamily,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("institutional_requests")
        .select("*")
        .eq("property_id", pid!)
        .order("start_date");
      if (error) throw error;
      return data as InstitutionalRequest[];
    },
  });
  const documents = useQuery({
    queryKey: ["documents", pid],
    enabled: !!pid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("property_id", pid ?? "")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const expenseData = useExpenseData(pid, isFamily);
  const guestRequests = usePendingGuestRequests(pid, isAdmin);

  const items = buildNotifications({
    today: localToday(),
    myMemberId: currentMember?.id ?? null,
    isAdmin,
    isFamily,
    hasName: !!(profile?.display_name ?? "").trim(),
    members,
    invitations: invitations.data,
    bookings: bookings.data,
    guestRequests: guestRequests.data,
    requests: requests.data,
    tasks: tasks.data,
    splits: expenseData.data?.splits,
    expenses: expenseData.data?.expenses,
    documents: documents.data,
  });
  const failed = [invitations, bookings, tasks, documents].some((q) => q.isError && !q.data);
  const loading = invitations.isLoading || bookings.isLoading || tasks.isLoading;
  return { items, loading, failed, userId: user?.id };
}

function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

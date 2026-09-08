import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Inbox } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Avatar, EmptyState, LoadingCards, PageHeader } from "@/components/bits";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/account";
import { fmtDate, type Booking } from "@/lib/data";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/schvalovani")({
  head: () => ({
    meta: [
      { title: "Approvals — My Chata" },
      { name: "description", content: "Overview of bookings awaiting approval." },
      { property: "og:title", content: "Approvals — My Chata" },
      { property: "og:description", content: "Overview of bookings awaiting approval." },
    ],
  }),
  component: ApprovalsPage,
});

function ApprovalsPage() {
  const { property, currentMember } = useAccount();
  const queryClient = useQueryClient();
  const { t, lang } = useLang();

  const { data: pending, isLoading } = useQuery({
    queryKey: ["bookings", property?.id],
    enabled: !!property,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("property_id", property!.id)
        .eq("status", "PENDING")
        .order("start_date");
      if (error) throw error;
      return data as Booking[];
    },
  });

  const decide = useMutation({
    mutationFn: async ({ id, approve }: { id: string; approve: boolean }) => {
      if (approve) {
        const { error } = await supabase.from("bookings").update({ status: "CONFIRMED" }).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("bookings").delete().eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: (_d, v) => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      toast.success(v.approve ? t("Rezervace schválena.", "Booking approved.") : t("Rezervace zamítnuta.", "Booking declined."));
    },
    onError: () => toast.error(t("Akce se nepodařila.", "The action failed.")),
  });

  const isAdmin = currentMember?.role === "ADMIN" || currentMember?.role === "OWNER";

  return (
    <AppShell>
      <PageHeader
        title={t("Ke schválení", "Approvals")}
        subtitle={t("Rodinné rezervace čekající na vaše rozhodnutí.", "Family bookings awaiting your decision.")}
      />

      {isLoading ? (
        <LoadingCards />
      ) : !pending?.length ? (
        <EmptyState
          icon={Inbox}
          title={t("Žádné rezervace ke schválení.", "No bookings awaiting approval.")}
          hint={t("Všechny žádosti jsou vyřízené.", "All requests have been handled.")}
        />
      ) : (
        <div className="space-y-3">
          {pending.map((b) => (
            <article key={b.id} className="card p-4">
              <div className="flex items-center gap-3">
                <Avatar name={b.requester_name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-bold">{b.requester_name}</p>
                  <p className="text-[14px] text-muted-foreground">
                    {fmtDate(b.start_date)} – {fmtDate(b.end_date)} · {b.guests} {lang === "en" ? "guests" : "hostů"}
                  </p>
                </div>
              </div>
              {b.note && <p className="mt-2 rounded-2xl bg-background p-3 text-[14px]">„{b.note}“</p>}
              {isAdmin ? (
                <div className="mt-3 flex gap-2">
                  <button onClick={() => decide.mutate({ id: b.id, approve: true })} className="btn-primary flex-1">
                    {t("Schválit", "Approve")}
                  </button>
                  <button onClick={() => decide.mutate({ id: b.id, approve: false })} className="btn-danger flex-1">
                    {t("Zamítnout", "Decline")}
                  </button>
                </div>
              ) : (
                <p className="mt-3 text-[13px] font-semibold text-muted-foreground">
                  {t("Schválit může správce rodiny.", "Only the family admin can approve.")}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </AppShell>
  );
}

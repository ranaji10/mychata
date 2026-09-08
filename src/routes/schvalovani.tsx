import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Inbox } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Avatar, EmptyState, LoadingCards, PageHeader } from "@/components/bits";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/account";
import { fmtDate, type Booking } from "@/lib/data";

export const Route = createFileRoute("/schvalovani")({
  head: () => ({
    meta: [
      { title: "Ke schválení — My Chata" },
      { name: "description", content: "Přehled rezervací čekajících na schválení." },
      { property: "og:title", content: "Ke schválení — My Chata" },
      { property: "og:description", content: "Přehled rezervací čekajících na schválení." },
    ],
  }),
  component: ApprovalsPage,
});

function ApprovalsPage() {
  const { property, currentMember } = useAccount();
  const queryClient = useQueryClient();

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

  const mutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "CONFIRMED" | "REJECTED" }) => {
      const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      toast.success(v.status === "CONFIRMED" ? "Rezervace schválena." : "Rezervace zamítnuta.");
    },
    onError: () => toast.error("Akce se nepodařila."),
  });

  return (
    <AppShell>
      <PageHeader title="Ke schválení" subtitle="Rodinné rezervace čekající na vaše rozhodnutí." />

      {isLoading ? (
        <LoadingCards />
      ) : !pending?.length ? (
        <EmptyState icon={Inbox} title="Žádné rezervace ke schválení." hint="Všechny žádosti jsou vyřízené." />
      ) : (
        <div className="space-y-3">
          {pending.map((b) => (
            <article key={b.id} className="card p-4">
              <div className="flex items-center gap-3">
                <Avatar name={b.requester_name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-bold">{b.requester_name}</p>
                  <p className="text-[14px] text-muted-foreground">
                    {fmtDate(b.start_date)} – {fmtDate(b.end_date)} · {b.guests} hostů
                  </p>
                </div>
              </div>
              {b.note && <p className="mt-2 rounded-2xl bg-background p-3 text-[14px]">„{b.note}“</p>}
              {currentMember?.is_admin || b.member_id !== currentMember?.id ? (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => mutation.mutate({ id: b.id, status: "CONFIRMED" })}
                    className="btn-primary flex-1"
                  >
                    Schválit
                  </button>
                  <button
                    onClick={() => mutation.mutate({ id: b.id, status: "REJECTED" })}
                    className="btn-danger flex-1"
                  >
                    Zamítnout
                  </button>
                </div>
              ) : (
                <p className="mt-3 text-[13px] font-semibold text-muted-foreground">
                  Schválit může správce rodiny.
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </AppShell>
  );
}

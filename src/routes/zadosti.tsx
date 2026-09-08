import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Inbox } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { EmptyState, LoadingCards, PageHeader, PillMuted, PillOk, PillWarn } from "@/components/bits";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/account";
import { fmtDate, fmtDateTime, REASON_LABELS, type InstitutionalRequest } from "@/lib/data";

export const Route = createFileRoute("/zadosti")({
  head: () => ({
    meta: [
      { title: "Žádosti — My Chata" },
      { name: "description", content: "Žádosti zaměstnanců o pobyt na chatě ke schválení." },
      { property: "og:title", content: "Žádosti — My Chata" },
      { property: "og:description", content: "Žádosti zaměstnanců o pobyt na chatě ke schválení." },
    ],
  }),
  component: RequestsPage,
});

function RequestsPage() {
  const { property } = useAccount();
  const queryClient = useQueryClient();

  const { data: requests, isLoading } = useQuery({
    queryKey: ["requests", property?.id],
    enabled: !!property,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("institutional_requests")
        .select("*")
        .eq("property_id", property!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as InstitutionalRequest[];
    },
  });

  const decide = useMutation({
    mutationFn: async ({ req, status }: { req: InstitutionalRequest; status: "APPROVED" | "REJECTED" }) => {
      const { error } = await supabase.from("institutional_requests").update({ status }).eq("id", req.id);
      if (error) throw error;
      if (status === "APPROVED") {
        const { error: bErr } = await supabase.from("bookings").insert({
          property_id: req.property_id,
          requester_name: req.requester_name,
          start_date: req.start_date,
          end_date: req.end_date,
          guests: req.guests,
          status: "CONFIRMED",
          source: "REQUEST",
        });
        if (bErr) throw bErr;
      }
    },
    onSuccess: (_d, v) => {
      queryClient.invalidateQueries({ queryKey: ["requests", property?.id] });
      queryClient.invalidateQueries({ queryKey: ["bookings", property?.id] });
      toast.success(v.status === "APPROVED" ? "Žádost schválena a pobyt zapsán do kalendáře." : "Žádost zamítnuta.");
    },
    onError: () => toast.error("Akce se nepodařila."),
  });

  const pending = requests?.filter((r) => r.status === "PENDING") ?? [];
  const processed = requests?.filter((r) => r.status !== "PENDING") ?? [];

  return (
    <AppShell>
      <PageHeader title="Žádosti o pobyt" subtitle="Schvalujte žádosti zaměstnanců." />

      {isLoading ? (
        <LoadingCards />
      ) : pending.length === 0 && processed.length === 0 ? (
        <EmptyState icon={Inbox} title="Žádné žádosti." hint="Nové žádosti z veřejného formuláře se objeví zde." />
      ) : (
        <>
          {pending.length > 0 && (
            <section>
              <h3 className="mb-2 text-lg font-bold">Čekající ({pending.length})</h3>
              <div className="space-y-3">
                {pending.map((r) => (
                  <article key={r.id} className="card p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-lg font-bold">{r.requester_name}</p>
                        <p className="text-[13px] text-muted-foreground">{r.email}</p>
                      </div>
                      {r.has_conflict && (
                        <span className="pill bg-warn-soft text-warn">
                          <AlertTriangle className="size-3.5" /> Kolize
                        </span>
                      )}
                    </div>
                    <div className="mt-2 space-y-1 text-[14px]">
                      <p><span className="font-bold">Termín:</span> {fmtDate(r.start_date)} – {fmtDate(r.end_date)}</p>
                      <p><span className="font-bold">Hostů:</span> {r.guests}</p>
                      <p><span className="font-bold">Důvod:</span> {REASON_LABELS[r.reason]}</p>
                      <p className="text-[12px] text-muted-foreground">Odesláno {fmtDateTime(r.created_at)}</p>
                    </div>
                    {r.has_conflict && (
                      <p className="mt-2 rounded-2xl bg-warn-soft p-3 text-[13px] font-semibold text-warn">
                        Termín se překrývá s jiným pobytem. Schválením vznikne kolize v kalendáři.
                      </p>
                    )}
                    <div className="mt-3 flex gap-2">
                      <button onClick={() => decide.mutate({ req: r, status: "APPROVED" })} className="btn-primary flex-1">
                        Schválit
                      </button>
                      <button onClick={() => decide.mutate({ req: r, status: "REJECTED" })} className="btn-danger flex-1">
                        Zamítnout
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {processed.length > 0 && (
            <section className="mt-5">
              <h3 className="mb-2 text-lg font-bold">Vyřízené</h3>
              <div className="space-y-2.5">
                {processed.map((r) => (
                  <div key={r.id} className="card flex items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-bold">{r.requester_name}</p>
                      <p className="text-[13px] text-muted-foreground">
                        {fmtDate(r.start_date)} – {fmtDate(r.end_date)}
                      </p>
                    </div>
                    {r.status === "APPROVED" ? <PillOk>Schváleno</PillOk> : <PillMuted>Zamítnuto</PillMuted>}
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <Link to="/export" className="btn-secondary mt-4 w-full">
        Export využití
        <PillWarn>CSV</PillWarn>
      </Link>
    </AppShell>
  );
}

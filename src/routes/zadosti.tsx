import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Inbox } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { EmptyState, LoadingCards, PageHeader, PillNeutral, PillOk, PillWarn } from "@/components/bits";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/account";
import { fmtDate, fmtDateTime, type InstitutionalRequest } from "@/lib/data";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/zadosti")({
  head: () => ({
    meta: [
      { title: "Requests — My Chata" },
      { name: "description", content: "Employee cottage stay requests awaiting approval." },
      { property: "og:title", content: "Requests — My Chata" },
      { property: "og:description", content: "Employee cottage stay requests awaiting approval." },
    ],
  }),
  component: RequestsPage,
});

function RequestsPage() {
  const { t } = useLang();
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
    mutationFn: async ({ req, approve }: { req: InstitutionalRequest; approve: boolean }) => {
      const { error } = await supabase
        .from("institutional_requests")
        .update({ status: approve ? "APPROVED" : "DECLINED" })
        .eq("id", req.id);
      if (error) throw error;
      if (approve) {
        const { error: bErr } = await supabase.from("bookings").insert({
          property_id: req.property_id,
          requester_name: req.requester_name,
          start_date: req.start_date,
          end_date: req.end_date,
          guests: req.guests,
          note: req.note,
          status: "CONFIRMED",
        });
        if (bErr) throw bErr;
      }
    },
    onSuccess: (_d, v) => {
      queryClient.invalidateQueries({ queryKey: ["requests", property?.id] });
      queryClient.invalidateQueries({ queryKey: ["bookings", property?.id] });
      toast.success(v.approve ? t("Žádost schválena a pobyt zapsán do kalendáře.", "Request approved and the stay added to the calendar.") : t("Žádost zamítnuta.", "Request declined."));
    },
    onError: () => toast.error(t("Akce se nepodařila.", "The action failed.")),
  });

  const pending = requests?.filter((r) => r.status === "PENDING") ?? [];
  const processed = requests?.filter((r) => r.status !== "PENDING") ?? [];

  return (
    <AppShell>
      <PageHeader title={t("Žádosti o pobyt", "Stay requests")} subtitle={t("Schvalujte žádosti zaměstnanců.", "Approve employee requests.")} />

      {isLoading ? (
        <LoadingCards />
      ) : pending.length === 0 && processed.length === 0 ? (
        <EmptyState icon={Inbox} title={t("Žádné žádosti.", "No requests.")} hint={t("Nové žádosti z veřejného formuláře se objeví zde.", "New requests from the public form will appear here.")} />
      ) : (
        <>
          {pending.length > 0 && (
            <section>
              <h3 className="mb-2 text-lg font-bold">{t("Čekající", "Pending")} ({pending.length})</h3>
              <div className="space-y-3">
                {pending.map((r) => (
                  <article key={r.id} className="card p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-lg font-bold">{r.requester_name}</p>
                        <p className="text-[13px] text-muted-foreground">{r.requester_email}</p>
                      </div>
                      {r.has_conflict && (
                        <span className="pill bg-warn-soft text-warn">
                          <AlertTriangle className="size-3.5" /> {t("Kolize", "Conflict")}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 space-y-1 text-[14px]">
                      <p><span className="font-bold">{t("Termín:", "Dates:")}</span> {fmtDate(r.start_date)} – {fmtDate(r.end_date)}</p>
                      <p><span className="font-bold">{t("Hostů:", "Guests:")}</span> {r.guests}</p>
                      {r.affiliation && <p><span className="font-bold">{t("Oddělení:", "Department:")}</span> {r.affiliation}</p>}
                      {r.note && <p className="rounded-2xl bg-background p-2.5">„{r.note}“</p>}
                      <p className="text-[12px] text-muted-foreground">{t("Odesláno", "Sent")} {fmtDateTime(r.created_at)}</p>
                    </div>
                    {r.has_conflict && (
                      <p className="mt-2 rounded-2xl bg-warn-soft p-3 text-[13px] font-semibold text-warn">
                        {t("Termín se překrývá s jiným pobytem. Schválením vznikne kolize v kalendáři.", "These dates overlap with another stay. Approving will create a conflict in the calendar.")}
                      </p>
                    )}
                    <div className="mt-3 flex gap-2">
                      <button onClick={() => decide.mutate({ req: r, approve: true })} className="btn-primary flex-1">
                        {t("Schválit", "Approve")}
                      </button>
                      <button onClick={() => decide.mutate({ req: r, approve: false })} className="btn-danger flex-1">
                        {t("Zamítnout", "Decline")}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {processed.length > 0 && (
            <section className="mt-5">
              <h3 className="mb-2 text-lg font-bold">{t("Vyřízené", "Processed")}</h3>
              <div className="space-y-2.5">
                {processed.map((r) => (
                  <div key={r.id} className="card flex items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-bold">{r.requester_name}</p>
                      <p className="text-[13px] text-muted-foreground">
                        {fmtDate(r.start_date)} – {fmtDate(r.end_date)}
                      </p>
                    </div>
                    {r.status === "APPROVED" ? <PillOk>{t("Schváleno", "Approved")}</PillOk> : <PillNeutral>{t("Zamítnuto", "Declined")}</PillNeutral>}
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <Link to="/export" className="btn-secondary mt-4 w-full">
        {t("Export využití", "Usage export")}
        <PillWarn>CSV</PillWarn>
      </Link>
    </AppShell>
  );
}

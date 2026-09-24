import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Inbox } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { EmptyState, LoadingCards, PageHeader, PillNeutral, PillOk, PillWarn } from "@/components/bits";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/account";
import { declineReasons, fmtDate, fmtDateTime, type InstitutionalRequest } from "@/lib/data";
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
  const { t, lang } = useLang();
  const { property } = useAccount();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string[]>([]);
  const [declining, setDeclining] = useState<InstitutionalRequest[]>([]);
  const [declineReason, setDeclineReason] = useState("");

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
    mutationFn: async ({ requests, approve, reason }: { requests: InstitutionalRequest[]; approve: boolean; reason?: string }) => {
      for (const req of requests) {
        const { error } = await supabase
          .from("institutional_requests")
          .update({ status: approve ? "APPROVED" : "DECLINED", decline_reason: approve ? null : reason })
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
      }
    },
    onSuccess: (_d, v) => {
      queryClient.invalidateQueries({ queryKey: ["requests", property?.id] });
      queryClient.invalidateQueries({ queryKey: ["bookings", property?.id] });
      setSelected([]);
      setDeclining([]);
      setDeclineReason("");
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
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-lg font-bold">{t("Čekající", "Pending")} ({pending.length})</h3>
                <button onClick={() => setSelected(selected.length === pending.length ? [] : pending.map((request) => request.id))} className="min-h-11 text-[14px] font-bold text-primary">
                  {selected.length === pending.length ? t("Zrušit výběr", "Clear") : t("Vybrat vše", "Select all")}
                </button>
              </div>
              {selected.length > 0 && (
                <div className="card mb-3 grid grid-cols-2 gap-2 p-3">
                  <button onClick={() => decide.mutate({ requests: pending.filter((request) => selected.includes(request.id)), approve: true })} className="btn-primary">{t("Schválit vybrané", "Approve selected")}</button>
                  <button onClick={() => setDeclining(pending.filter((request) => selected.includes(request.id)))} className="btn-danger">{t("Zamítnout vybrané", "Decline selected")}</button>
                </div>
              )}
              <div className="space-y-3">
                {pending.map((r) => (
                  <article key={r.id} className="card p-4">
                    <div className="flex items-start justify-between gap-2">
                      <label className="flex min-h-11 min-w-0 flex-1 items-start gap-3">
                        <input type="checkbox" checked={selected.includes(r.id)} onChange={() => setSelected((ids) => ids.includes(r.id) ? ids.filter((id) => id !== r.id) : [...ids, r.id])} className="mt-1 size-5 accent-primary" />
                        <div className="min-w-0">
                        <p className="truncate text-lg font-bold">{r.requester_name}</p>
                        <p className="text-[13px] text-muted-foreground">{r.requester_email}</p>
                        </div>
                      </label>
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
                      <div className="mt-2 rounded-2xl bg-warn-soft p-3 text-[13px] font-semibold text-warn">
                        <p>{t("Termín se překrývá s jiným pobytem:", "These dates overlap with another stay:")}</p>
                        {r.conflict_note && <p className="mt-1">{r.conflict_note}</p>}
                      </div>
                    )}
                    <div className="mt-3 flex gap-2">
                      <button onClick={() => decide.mutate({ requests: [r], approve: true })} className="btn-primary flex-1">
                        {t("Schválit", "Approve")}
                      </button>
                      <button onClick={() => setDeclining([r])} className="btn-danger flex-1">
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

      {declining.length > 0 && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-foreground/35 p-4 sm:place-items-center">
          <section className="card w-full max-w-[400px] p-4" role="dialog" aria-modal="true" aria-labelledby="decline-title">
            <h2 id="decline-title" className="text-xl font-bold">{t("Důvod zamítnutí", "Decline reason")}</h2>
            <p className="mt-1 text-[14px] text-muted-foreground">{declining.length} {t("žádostí bude zamítnuto.", "request(s) will be declined.")}</p>
            <select value={declineReason} onChange={(event) => setDeclineReason(event.target.value)} className="field mt-4">
              <option value="">{t("Vyberte důvod", "Choose a reason")}</option>
              {declineReasons(lang).map((reason) => <option key={reason} value={reason}>{reason}</option>)}
            </select>
            <div className="mt-4 flex gap-2">
              <button onClick={() => decide.mutate({ requests: declining, approve: false, reason: declineReason })} disabled={!declineReason} className="btn-danger flex-1 disabled:opacity-40">{t("Potvrdit zamítnutí", "Confirm decline")}</button>
              <button onClick={() => { setDeclining([]); setDeclineReason(""); }} className="btn-secondary">{t("Zrušit", "Cancel")}</button>
            </div>
          </section>
        </div>
      )}
    </AppShell>
  );
}

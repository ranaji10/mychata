import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Circle, ClipboardCheck, History } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { EmptyState, LoadingCards, PageHeader, PillOk } from "@/components/bits";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/account";
import { fmtDateTime, HANDOVER_CHECKLIST, type Handover } from "@/lib/data";

export const Route = createFileRoute("/predani")({
  head: () => ({
    meta: [
      { title: "Předání chaty — My Chata" },
      { name: "description", content: "Checklist předání chaty a historie předání." },
      { property: "og:title", content: "Předání chaty — My Chata" },
      { property: "og:description", content: "Checklist předání chaty a historie předání." },
    ],
  }),
  component: HandoverPage,
});

function HandoverPage() {
  const { property, currentMember } = useAccount();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [checked, setChecked] = useState<boolean[]>(HANDOVER_CHECKLIST.map(() => false));
  const [note, setNote] = useState("");

  const { data: history, isLoading } = useQuery({
    queryKey: ["handovers", property?.id],
    enabled: !!property,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("handovers")
        .select("*")
        .eq("property_id", property!.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data as Handover[];
    },
  });

  const doneCount = checked.filter(Boolean).length;
  const allDone = doneCount === HANDOVER_CHECKLIST.length;

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("handovers").insert({
        property_id: property!.id,
        performed_by: currentMember?.name ?? "Neznámý",
        checklist: HANDOVER_CHECKLIST.map((item, i) => ({ item, done: checked[i] })),
        note: note || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Předání chaty zaznamenáno.");
      queryClient.invalidateQueries({ queryKey: ["handovers", property?.id] });
      navigate({ to: "/domu" });
    },
    onError: () => toast.error("Předání se nepodařilo uložit."),
  });

  return (
    <AppShell>
      <PageHeader title="Předání chaty" subtitle="Zkontrolujte vše před odjezdem." />

      <section className="card p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Checklist</h3>
          <span className="text-[14px] font-bold text-muted-foreground">
            {doneCount}/{HANDOVER_CHECKLIST.length}
          </span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(doneCount / HANDOVER_CHECKLIST.length) * 100}%` }} />
        </div>

        <div className="mt-3 space-y-1">
          {HANDOVER_CHECKLIST.map((item, i) => (
            <button
              key={item}
              onClick={() => setChecked((c) => c.map((v, j) => (j === i ? !v : v)))}
              className="flex w-full items-center gap-3 rounded-2xl p-2 text-left active:bg-secondary"
            >
              {checked[i] ? (
                <CheckCircle2 className="size-7 shrink-0 text-ok" />
              ) : (
                <Circle className="size-7 shrink-0 text-muted-foreground" />
              )}
              <span className={`text-[15px] font-semibold ${checked[i] ? "text-muted-foreground line-through" : ""}`}>{item}</span>
            </button>
          ))}
        </div>

        <div className="mt-3">
          <label htmlFor="handover-note" className="mb-1 block text-[13px] font-bold">Poznámka (nepovinné)</label>
          <textarea
            id="handover-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Např. kapka vody pod dřezem…"
            className="field resize-none"
          />
        </div>

        <button onClick={() => save.mutate()} disabled={!allDone} className="btn-primary mt-4 w-full disabled:opacity-40">
          {allDone ? "Dokončit předání" : `Zbývá ${HANDOVER_CHECKLIST.length - doneCount} bodů`}
        </button>
      </section>

      <section className="mt-4">
        <div className="mb-2 flex items-center gap-2">
          <History className="size-5 text-muted-foreground" />
          <h3 className="text-lg font-bold">Historie předání</h3>
        </div>
        {isLoading ? (
          <LoadingCards />
        ) : !history?.length ? (
          <EmptyState icon={ClipboardCheck} title="Zatím žádná předání." hint="Po dokončení checklistu se zobrazí zde." />
        ) : (
          <div className="space-y-2.5">
            {history.map((h) => (
              <div key={h.id} className="card p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[15px] font-bold">{h.performed_by}</p>
                  <PillOk>Dokončeno</PillOk>
                </div>
                <p className="text-[13px] text-muted-foreground">{fmtDateTime(h.created_at)}</p>
                {h.note && <p className="mt-2 rounded-2xl bg-background p-3 text-[14px]">„{h.note}“</p>}
              </div>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}

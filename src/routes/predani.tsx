import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, CheckCircle2, Circle, ClipboardCheck, History, Wrench } from "lucide-react";
import { useState } from "react";
import { useEffect } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { EmptyState, LoadingCards, PageHeader, PillOk } from "@/components/bits";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/account";
import { useLang } from "@/lib/i18n";
import { fmtDateTime, todayISO, type Booking, type Handover } from "@/lib/data";

export const Route = createFileRoute("/predani")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Handover — My Chata" },
      { name: "description", content: "Cottage handover checklist and handover history." },
      { property: "og:title", content: "Handover — My Chata" },
      { property: "og:description", content: "Cottage handover checklist and handover history." },
    ],
  }),
  component: HandoverPage,
});

function HandoverPage() {
  const { property, currentMember, members } = useAccount();
  const { t } = useLang();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const DEFAULT_CHECKLIST = [
    t("Uklidit a vynést odpadky", "Clean up and take out the rubbish"),
    t("Zkontrolovat uzavření oken a dveří", "Check that windows and doors are closed"),
    t("Vypnout spotřebiče a topení", "Turn off appliances and heating"),
    t("Uzavřít vodu a plyn", "Turn off water and gas"),
    t("Zamknout chatu a vrátit klíče", "Lock the cottage and return the keys"),
  ];
  const items = property?.handover_items?.length ? property.handover_items : DEFAULT_CHECKLIST;
  const [checked, setChecked] = useState<boolean[]>(items.map(() => false));
  const [note, setNote] = useState("");
  const [issue, setIssue] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  useEffect(() => {
    if (!property) return;
    try {
      const saved = localStorage.getItem(`mychata.handover.${property.id}`);
      if (!saved) return;
      const draft = JSON.parse(saved) as { checked?: boolean[]; note?: string; issue?: string };
      if (draft.checked?.length === items.length) setChecked(draft.checked);
      setNote(draft.note ?? ""); setIssue(draft.issue ?? "");
    } catch { /* ignore invalid local draft */ }
  }, [property?.id, items.length]);
  useEffect(() => {
    if (!property) return;
    localStorage.setItem(`mychata.handover.${property.id}`, JSON.stringify({ checked, note, issue }));
  }, [property?.id, checked, note, issue]);

  const { data: activeBooking } = useQuery({
    queryKey: ["handover-booking", property?.id, currentMember?.id], enabled: !!property && !!currentMember,
    queryFn: async () => {
      const { data, error } = await supabase.from("bookings").select("*").eq("property_id", property?.id ?? "").eq("requester_member_id", currentMember?.id ?? "").lte("start_date", todayISO()).gte("end_date", todayISO()).order("start_date").limit(1).maybeSingle();
      if (error) throw error; return data as Booking | null;
    },
  });

  const { data: history, isLoading } = useQuery({
    queryKey: ["handovers", property?.id],
    enabled: !!property,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("handovers")
        .select("*")
        .eq("property_id", property!.id)
        .order("submitted_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data.map((handover) => ({
        ...handover,
        checklist_state: handover.checklist_state as Handover["checklist_state"],
      }));
    },
  });

  const doneCount = checked.filter(Boolean).length;
  const allDone = doneCount === items.length;

  const save = useMutation({
    mutationFn: async () => {
      let photoUrl: string | null = null;
      if (photo && property) { const path = `${property.id}/handovers/${crypto.randomUUID()}-${photo.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`; const { error } = await supabase.storage.from("my-chata-files").upload(path, photo); if (error) throw error; photoUrl = path; }
      const { data: handover, error } = await supabase.from("handovers").insert({
        property_id: property!.id,
        booking_id: activeBooking?.id ?? null,
        member_id: currentMember?.id ?? null,
        checklist_state: Object.fromEntries(items.map((item, i) => [item, { state: checked[i] ? "checked" : "na" }])),
        note: note || null,
        photo_url: photoUrl,
      }).select("id").single();
      if (error) throw error;
      if (issue && property && handover) {
        const { data: task, error: taskError } = await supabase.from("tasks").insert({ property_id: property.id, title: issue, title_cs: issue, title_en: issue, source_language: "cs", category: "repair", urgency: "HIGH", created_by: currentMember?.name ?? "" }).select("id").single();
        if (taskError) throw taskError;
        const { error: issueError } = await supabase.from("handover_issues").insert({ handover_id: handover.id, property_id: property.id, task_id: task.id, title: issue });
        if (issueError) throw issueError;
      }
    },
    onSuccess: () => {
      if (property) localStorage.removeItem(`mychata.handover.${property.id}`);
      toast.success(t("Předání chaty zaznamenáno.", "Handover recorded."));
      queryClient.invalidateQueries({ queryKey: ["handovers", property?.id] });
      navigate({ to: "/domu" });
    },
    onError: () => toast.error(t("Předání se nepodařilo uložit.", "Could not save the handover.")),
  });

  const memberName = (id: string | null) => members.find((m) => m.id === id)?.name ?? t("Neznámý", "Unknown");

  return (
    <AppShell>
      <PageHeader title={t("Předání chaty", "Cottage handover")} subtitle={t("Zkontrolujte vše před odjezdem.", "Check everything before you leave.")} />

      <section className="card p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">{t("Checklist", "Checklist")}</h3>
          <span className="text-[14px] font-bold text-muted-foreground">
            {doneCount}/{items.length}
          </span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(doneCount / items.length) * 100}%` }} />
        </div>

        <div className="mt-3 space-y-1">
          {items.map((item, i) => (
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
          <label htmlFor="handover-note" className="mb-1 block text-[13px] font-bold">{t("Poznámka (nepovinné)", "Note (optional)")}</label>
          <textarea
            id="handover-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder={t("Např. kapka vody pod dřezem…", "E.g. a drip of water under the sink…")}
            className="field resize-none"
          />
        </div>

        <div className="mt-3">
          <label htmlFor="handover-issue" className="mb-1 flex items-center gap-2 text-[13px] font-bold"><Wrench className="size-4" />{t("Nahlásit závadu (nepovinné)", "Report an issue (optional)")}</label>
          <input id="handover-issue" value={issue} onChange={(e) => setIssue(e.target.value)} className="field" placeholder={t("Např. protékající kohoutek", "E.g. leaking tap")} />
        </div>
        <label className="btn-secondary mt-3 w-full cursor-pointer"><Camera className="size-5" />{photo ? photo.name : t("Přidat kontrolní fotografii", "Add inspection photo")}<input type="file" accept="image/jpeg,image/png" className="sr-only" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} /></label>

        <button onClick={() => save.mutate()} disabled={!allDone} className="btn-primary mt-4 w-full disabled:opacity-40">
          {allDone ? t("Dokončit předání", "Complete handover") : t(`Zbývá ${items.length - doneCount} bodů`, `${items.length - doneCount} items left`)}
        </button>
      </section>

      <section className="mt-4">
        <div className="mb-2 flex items-center gap-2">
          <History className="size-5 text-muted-foreground" />
          <h3 className="text-lg font-bold">{t("Historie předání", "Handover history")}</h3>
        </div>
        {isLoading ? (
          <LoadingCards />
        ) : !history?.length ? (
          <EmptyState icon={ClipboardCheck} title={t("Zatím žádná předání.", "No handovers yet.")} hint={t("Po dokončení checklistu se zobrazí zde.", "They will appear here once you complete a checklist.")} />
        ) : (
          <div className="space-y-2.5">
            {history.map((h) => (
              <div key={h.id} className="card p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[15px] font-bold">{memberName(h.member_id)}</p>
                  <PillOk>{t("Dokončeno", "Completed")}</PillOk>
                </div>
                <p className="text-[13px] text-muted-foreground">{fmtDateTime(h.submitted_at)}</p>
                {h.note && <p className="mt-2 rounded-2xl bg-background p-3 text-[14px]">„{h.note}“</p>}
              </div>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}

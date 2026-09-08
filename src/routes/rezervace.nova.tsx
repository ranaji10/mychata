import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, Minus, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/account";
import { findConflicts, fmtDate, todayISO, type Booking } from "@/lib/data";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/rezervace/nova")({
  head: () => ({
    meta: [
      { title: "New booking — My Chata" },
      { name: "description", content: "Book a stay at the cottage." },
      { property: "og:title", content: "New booking — My Chata" },
      { property: "og:description", content: "Book a stay at the cottage." },
    ],
  }),
  component: NewBooking,
});

function NewBooking() {
  const { property, currentMember } = useAccount();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useLang();

  const [start, setStart] = useState(todayISO());
  const [end, setEnd] = useState(todayISO());
  const [guests, setGuests] = useState(2);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: bookings } = useQuery({
    queryKey: ["bookings", property?.id],
    enabled: !!property,
    queryFn: async () => {
      const { data, error } = await supabase.from("bookings").select("*").eq("property_id", property!.id);
      if (error) throw error;
      return data as Booking[];
    },
  });

  const conflicts = findConflicts(start, end, bookings ?? []);
  const hard = conflicts.find((c) => c.kind === "hard");
  const sameDay = conflicts.find((c) => c.kind === "same-day");
  const invalid = end < start;

  const save = async () => {
    if (!property || !currentMember || invalid || hard) return;
    setSaving(true);
    const { error } = await supabase.from("bookings").insert({
      property_id: property.id,
      requester_member_id: currentMember.id,
      requester_name: currentMember.name,
      start_date: start,
      end_date: end,
      guests,
      note: note || null,
      status: "PENDING",
    });
    setSaving(false);
    if (error) {
      toast.error(t("Rezervaci se nepodařilo uložit.", "The booking could not be saved."));
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["bookings", property.id] });
    toast.success(t("Rezervace odeslána ke schválení.", "Booking sent for approval."));
    navigate({ to: "/kalendar" });
  };

  return (
    <AppShell>
      <div className="flex items-center gap-2">
        <button onClick={() => navigate({ to: "/kalendar" })} aria-label={t("Zpět", "Back")} className="grid size-11 place-items-center rounded-xl bg-secondary">
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="text-2xl font-bold">{t("Nová rezervace", "New booking")}</h1>
      </div>

      <section className="card mt-4 space-y-4 p-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="start" className="mb-1 block text-[13px] font-bold">{t("Příjezd", "Arrival")}</label>
            <input id="start" type="date" value={start} min={todayISO()} onChange={(e) => setStart(e.target.value)} className="field" />
          </div>
          <div>
            <label htmlFor="end" className="mb-1 block text-[13px] font-bold">{t("Odjezd", "Departure")}</label>
            <input id="end" type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} className="field" />
          </div>
        </div>

        <div>
          <span className="mb-1 block text-[13px] font-bold">{t("Počet hostů", "Number of guests")}</span>
          <div className="flex items-center gap-4 rounded-2xl border border-border bg-card px-4 py-2">
            <button onClick={() => setGuests((g) => Math.max(1, g - 1))} aria-label={t("Odebrat hosta", "Remove guest")} className="grid size-11 place-items-center rounded-xl bg-secondary">
              <Minus className="size-5" />
            </button>
            <span className="flex-1 text-center text-2xl font-bold">{guests}</span>
            <button onClick={() => setGuests((g) => Math.min(20, g + 1))} aria-label={t("Přidat hosta", "Add guest")} className="grid size-11 place-items-center rounded-xl bg-secondary">
              <Plus className="size-5" />
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="note" className="mb-1 block text-[13px] font-bold">{t("Poznámka (nepovinné)", "Note (optional)")}</label>
          <textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder={t("Např. dovezu dřevo, přivezu psa…", "E.g. bringing firewood, bringing the dog…")} className="field resize-none" />
        </div>

        {invalid && (
          <p className="rounded-2xl bg-danger-soft p-3 text-[14px] font-semibold text-danger">
            {t("Odjezd musí být po příjezdu.", "Departure must be after arrival.")}
          </p>
        )}

        {hard && (
          <p className="rounded-2xl bg-danger-soft p-3 text-[14px] font-semibold text-danger">
            {t("Termín se překrývá s pobytem:", "This date overlaps with a stay:")} {hard.other.name} ({fmtDate(hard.other.start)} – {fmtDate(hard.other.end)}).
          </p>
        )}

        {!hard && sameDay && (
          <p className="flex gap-2 rounded-2xl bg-warn-soft p-3 text-[14px] font-semibold text-warn">
            <AlertTriangle className="mt-0.5 size-5 shrink-0" />
            {t("Ve stejný den odjíždí", "On the same day, departing:")} {sameDay.other.name}. {t("Předání proběhne v den výměny.", "Handover will take place on the changeover day.")}
          </p>
        )}
      </section>

      <button onClick={save} disabled={saving || invalid || !!hard} className="btn-primary mt-4 w-full disabled:opacity-40">
        {saving ? t("Ukládám…", "Saving…") : t("Odeslat ke schválení", "Send for approval")}
      </button>
      <p className="mt-2 text-center text-[13px] text-muted-foreground">
        {t("Rezervaci schvaluje správce rodiny.", "The family admin approves the booking.")}
      </p>
    </AppShell>
  );
}

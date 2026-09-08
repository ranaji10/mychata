import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, Minus, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/account";
import { fmtDate, rangesOverlap, todayISO, type Booking } from "@/lib/data";

export const Route = createFileRoute("/rezervace/nova")({
  head: () => ({
    meta: [
      { title: "Nová rezervace — My Chata" },
      { name: "description", content: "Rezervace termínu pobytu na chatě." },
      { property: "og:title", content: "Nová rezervace — My Chata" },
      { property: "og:description", content: "Rezervace termínu pobytu na chatě." },
    ],
  }),
  component: NewBooking,
});

function NewBooking() {
  const { property, currentMember } = useAccount();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [start, setStart] = useState(todayISO());
  const [end, setEnd] = useState(todayISO());
  const [guests, setGuests] = useState(2);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: bookings } = useQuery({
    queryKey: ["bookings", property?.id],
    enabled: !!property,
    queryFn: async () => {
      const { data, error } = await supabase.from("bookings").select("*").eq("property_id", property!.id).neq("status", "CANCELLED").neq("status", "REJECTED");
      if (error) throw error;
      return data as Booking[];
    },
  });

  const conflict = bookings?.find((b) => rangesOverlap(start, end, b.start_date, b.end_date));
  const sameDay = !conflict && bookings?.find((b) => b.end_date === start);
  const invalid = end < start;

  const save = async () => {
    if (!property || !currentMember || invalid || conflict) return;
    setSaving(true);
    const { error } = await supabase.from("bookings").insert({
      property_id: property.id,
      member_id: currentMember.id,
      requester_name: currentMember.name,
      start_date: start,
      end_date: end,
      guests,
      note: note || null,
      status: "PENDING",
    });
    setSaving(false);
    if (error) {
      toast.error("Rezervaci se nepodařilo uložit.");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["bookings", property.id] });
    toast.success("Rezervace odeslána ke schválení.");
    navigate({ to: "/kalendar" });
  };

  return (
    <AppShell>
      <div className="flex items-center gap-2">
        <button onClick={() => navigate({ to: "/kalendar" })} aria-label="Zpět" className="grid size-11 place-items-center rounded-xl bg-secondary">
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="text-2xl font-bold">Nová rezervace</h1>
      </div>

      <section className="card mt-4 space-y-4 p-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="start" className="mb-1 block text-[13px] font-bold">Příjezd</label>
            <input id="start" type="date" value={start} min={todayISO()} onChange={(e) => setStart(e.target.value)} className="field" />
          </div>
          <div>
            <label htmlFor="end" className="mb-1 block text-[13px] font-bold">Odjezd</label>
            <input id="end" type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} className="field" />
          </div>
        </div>

        <div>
          <span className="mb-1 block text-[13px] font-bold">Počet hostů</span>
          <div className="flex items-center gap-4 rounded-2xl border border-border bg-card px-4 py-2">
            <button onClick={() => setGuests((g) => Math.max(1, g - 1))} aria-label="Odebrat hosta" className="grid size-11 place-items-center rounded-xl bg-secondary">
              <Minus className="size-5" />
            </button>
            <span className="flex-1 text-center text-2xl font-bold">{guests}</span>
            <button onClick={() => setGuests((g) => Math.min(20, g + 1))} aria-label="Přidat hosta" className="grid size-11 place-items-center rounded-xl bg-secondary">
              <Plus className="size-5" />
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="note" className="mb-1 block text-[13px] font-bold">Poznámka (nepovinné)</label>
          <textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Např. dovezu dřevo, přivezu psa…" className="field resize-none" />
        </div>

        {invalid && (
          <p className="rounded-2xl bg-danger-soft p-3 text-[14px] font-semibold text-danger">
            Odjezd musí být po příjezdu.
          </p>
        )}

        {conflict && (
          <p className="rounded-2xl bg-danger-soft p-3 text-[14px] font-semibold text-danger">
            Termín se překrývá s pobytem: {conflict.requester_name} ({fmtDate(conflict.start_date)} – {fmtDate(conflict.end_date)}).
          </p>
        )}

        {sameDay && (
          <p className="flex gap-2 rounded-2xl bg-warn-soft p-3 text-[14px] font-semibold text-warn">
            <AlertTriangle className="mt-0.5 size-5 shrink-0" />
            Ve stejný den odjíždí {sameDay.requester_name}. Předání proběhne v den výměny.
          </p>
        )}
      </section>

      <button onClick={save} disabled={saving || invalid || !!conflict} className="btn-primary mt-4 w-full disabled:opacity-40">
        {saving ? "Ukládám…" : "Odeslat ke schválení"}
      </button>
      <p className="mt-2 text-center text-[13px] text-muted-foreground">
        Rezervaci schvaluje správce rodiny.
      </p>
    </AppShell>
  );
}

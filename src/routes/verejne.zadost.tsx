import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Minus, Plus } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fmtDate, rangesOverlap, todayISO, type Booking, type Property } from "@/lib/data";
import chataImg from "@/assets/chata.jpg";

export const Route = createFileRoute("/verejne/zadost")({
  head: () => ({
    meta: [
      { title: "Žádost o pobyt — My Chata" },
      { name: "description", content: "Veřejný formulář žádosti o pobyt na firemní chatě." },
      { property: "og:title", content: "Žádost o pobyt — My Chata" },
      { property: "og:description", content: "Veřejný formulář žádosti o pobyt na firemní chatě." },
    ],
  }),
  component: PublicRequest,
});

const REASONS = [
  { value: "RECREATION", label: "Rekreace" },
  { value: "TEAMBUILDING", label: "Teambuilding" },
  { value: "OTHER", label: "Jiné" },
];

function PublicRequest() {
  const { data: property } = useQuery({
    queryKey: ["institutional-property"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("*, accounts!inner(type)")
        .eq("accounts.type", "INSTITUTIONAL")
        .limit(1)
        .single();
      if (error) throw error;
      return data as Property;
    },
  });

  const { data: bookings } = useQuery({
    queryKey: ["public-bookings", property?.id],
    enabled: !!property,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("property_id", property!.id)
        .in("status", ["CONFIRMED", "PENDING"]);
      if (error) throw error;
      return data as Booking[];
    },
  });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [start, setStart] = useState(todayISO());
  const [end, setEnd] = useState(todayISO());
  const [guests, setGuests] = useState(2);
  const [reason, setReason] = useState(REASONS[0].value);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState(false);

  const conflict = bookings?.find((b) => rangesOverlap(start, end, b.start_date, b.end_date));
  const invalid = end < start;
  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);

  const submit = async () => {
    if (!property || !name.trim() || !emailOk || invalid) return;
    setSaving(true);
    const { error } = await supabase.from("institutional_requests").insert({
      property_id: property.id,
      requester_name: name.trim(),
      email: email.trim(),
      start_date: start,
      end_date: end,
      guests,
      reason,
      note: note || null,
      status: "PENDING",
      has_conflict: !!conflict,
    });
    setSaving(false);
    if (error) return;
    setSent(true);
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-[420px] bg-background px-4 py-4 pb-8">
      <div className="relative overflow-hidden rounded-3xl">
        <img src={chataImg} alt={property?.name ?? "Firemní chata"} className="aspect-[16/9] w-full object-cover" width={1024} height={576} />
        <div className="absolute bottom-3 left-3 right-3 rounded-2xl bg-card/95 px-4 py-3 ring-1 ring-black/5">
          <p className="text-[12px] font-semibold text-muted-foreground">Žádost o pobyt</p>
          <p className="text-lg font-bold leading-tight">{property?.name ?? "Firemní chata"}</p>
        </div>
      </div>

      {sent ? (
        <div className="card mt-4 p-6 text-center">
          <CheckCircle2 className="mx-auto size-14 text-ok" />
          <h1 className="mt-3 text-2xl font-bold">Žádost odeslána</h1>
          <p className="mt-2 text-[15px] text-muted-foreground">
            Vaši žádost o termín {fmtDate(start)} – {fmtDate(end)} jsme přijali. O výsledku vás budeme informovat e-mailem.
          </p>
          <Link to="/" className="btn-secondary mt-4 w-full">Zpět na úvod</Link>
        </div>
      ) : (
        <section className="card mt-4 space-y-4 p-4">
          <h1 className="text-xl font-bold">Vyplňte žádost</h1>

          <div>
            <label htmlFor="req-name" className="mb-1 block text-[13px] font-bold">Jméno a příjmení</label>
            <input id="req-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jan Novák" className="field" />
          </div>

          <div>
            <label htmlFor="req-email" className="mb-1 block text-[13px] font-bold">E-mail</label>
            <input id="req-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jan.novak@email.cz" className="field" />
            {email && !emailOk && <p className="mt-1 text-[13px] font-semibold text-danger">Zadejte platný e-mail.</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="req-start" className="mb-1 block text-[13px] font-bold">Příjezd</label>
              <input id="req-start" type="date" value={start} min={todayISO()} onChange={(e) => setStart(e.target.value)} className="field" />
            </div>
            <div>
              <label htmlFor="req-end" className="mb-1 block text-[13px] font-bold">Odjezd</label>
              <input id="req-end" type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} className="field" />
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
            <span className="mb-1 block text-[13px] font-bold">Důvod pobytu</span>
            <div className="flex flex-wrap gap-2">
              {REASONS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setReason(r.value)}
                  className={`h-11 rounded-full px-4 text-[14px] font-bold ${
                    reason === r.value ? "bg-primary text-primary-foreground" : "bg-card ring-1 ring-black/10"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="req-note" className="mb-1 block text-[13px] font-bold">Poznámka (nepovinné)</label>
            <textarea id="req-note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="field resize-none" />
          </div>

          {invalid && (
            <p className="rounded-2xl bg-danger-soft p-3 text-[14px] font-semibold text-danger">Odjezd musí být po příjezdu.</p>
          )}
          {conflict && (
            <p className="rounded-2xl bg-warn-soft p-3 text-[14px] font-semibold text-warn">
              Tento termín je již částečně obsazený. Žádost odešlete, správce posoudí kolizi.
            </p>
          )}

          <button
            onClick={submit}
            disabled={saving || !name.trim() || !emailOk || invalid}
            className="btn-primary w-full disabled:opacity-40"
          >
            {saving ? "Odesílám…" : "Odeslat žádost"}
          </button>
        </section>
      )}
    </div>
  );
}

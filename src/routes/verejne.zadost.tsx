import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Minus, Plus } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { findConflicts, fmtDate, todayISO, type Booking, type Property } from "@/lib/data";
import { LanguageToggle, useLang } from "@/lib/i18n";
import chataImg from "@/assets/chata.jpg";

export const Route = createFileRoute("/verejne/zadost")({
  head: () => ({
    meta: [
      { title: "Stay request — My Chata" },
      { name: "description", content: "Public request form for a stay at the company cottage." },
      { property: "og:title", content: "Stay request — My Chata" },
      { property: "og:description", content: "Public request form for a stay at the company cottage." },
    ],
  }),
  component: PublicRequest,
});

function PublicRequest() {
  const { t } = useLang();
  const { data: property } = useQuery({
    queryKey: ["institutional-property"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("public_institutional_property").single();
      if (error) throw error;
      return data as Pick<Property, "id" | "name" | "address">;
    },
  });

  const { data: bookings } = useQuery({
    queryKey: ["public-bookings", property?.id],
    enabled: !!property,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("public_booking_availability", { _property_id: property?.id ?? "" });
      if (error) throw error;
      return (data ?? []).map((booking) => ({ ...booking, requester_name: t("Jiný pobyt", "Another stay"), requester_member_id: null, guests: 0, note: null, created_at: "", updated_at: "" })) as Booking[];
    },
  });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [affiliation, setAffiliation] = useState("");
  const [start, setStart] = useState(todayISO());
  const [end, setEnd] = useState(todayISO());
  const [guests, setGuests] = useState(2);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState(false);

  const conflicts = findConflicts(start, end, bookings ?? []);
  const hasConflict = conflicts.length > 0;
  const invalid = end < start;
  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);

  const submit = async () => {
    const prop = property;
    if (!prop || !name.trim() || !emailOk || invalid) return;
    setSaving(true);
    const { error } = await supabase.from("institutional_requests").insert({
      property_id: prop.id,
      requester_name: name.trim(),
      requester_email: email.trim(),
      affiliation: affiliation.trim() || null,
      start_date: start,
      end_date: end,
      guests,
      note: note || null,
      status: "PENDING",
      has_conflict: hasConflict,
      conflict_note: hasConflict
        ? conflicts.map((c) => `${c.other.name} (${c.other.start}–${c.other.end})`).join(", ")
        : null,
    });
    setSaving(false);
    if (error) return;
    setSent(true);
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-[420px] bg-background px-4 py-4 pb-8">
      <div className="mb-2 flex justify-end">
        <LanguageToggle />
      </div>

      <div className="relative overflow-hidden rounded-3xl">
        <img src={chataImg} alt={property?.name ?? t("Firemní chata", "Company cottage")} className="aspect-[16/9] w-full object-cover" width={1024} height={576} />
        <div className="absolute bottom-3 left-3 right-3 rounded-2xl bg-card/95 px-4 py-3 ring-1 ring-black/5">
          <p className="text-[12px] font-semibold text-muted-foreground">{t("Žádost o pobyt", "Stay request")}</p>
          <p className="text-lg font-bold leading-tight">{property?.name ?? t("Firemní chata", "Company cottage")}</p>
        </div>
      </div>

      {sent ? (
        <div className="card mt-4 p-6 text-center">
          <CheckCircle2 className="mx-auto size-14 text-ok" />
          <h1 className="mt-3 text-2xl font-bold">{t("Žádost odeslána", "Request sent")}</h1>
          <p className="mt-2 text-[15px] text-muted-foreground">
            {t(
              `Vaši žádost o termín ${fmtDate(start)} – ${fmtDate(end)} jsme přijali. O výsledku vás budeme informovat e-mailem.`,
              `We have received your request for ${fmtDate(start)} – ${fmtDate(end)}. We will let you know the outcome by email.`,
            )}
          </p>
          <Link to="/" className="btn-secondary mt-4 w-full">{t("Zpět na úvod", "Back to home")}</Link>
        </div>
      ) : (
        <section className="card mt-4 space-y-4 p-4">
          <h1 className="text-xl font-bold">{t("Vyplňte žádost", "Fill in the request")}</h1>

          <div>
            <label htmlFor="req-name" className="mb-1 block text-[13px] font-bold">{t("Jméno a příjmení", "Full name")}</label>
            <input id="req-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("Jan Novák", "John Smith")} className="field" />
          </div>

          <div>
            <label htmlFor="req-email" className="mb-1 block text-[13px] font-bold">{t("E-mail", "Email")}</label>
            <input id="req-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("jan.novak@email.cz", "john.smith@email.com")} className="field" />
            {email && !emailOk && <p className="mt-1 text-[13px] font-semibold text-danger">{t("Zadejte platný e-mail.", "Please enter a valid email address.")}</p>}
          </div>

          <div>
            <label htmlFor="req-aff" className="mb-1 block text-[13px] font-bold">{t("Oddělení (nepovinné)", "Department (optional)")}</label>
            <input id="req-aff" value={affiliation} onChange={(e) => setAffiliation(e.target.value)} placeholder={t("Např. Katedra botaniky", "E.g. Botany department")} className="field" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="req-start" className="mb-1 block text-[13px] font-bold">{t("Příjezd", "Arrival")}</label>
              <input id="req-start" type="date" value={start} min={todayISO()} onChange={(e) => setStart(e.target.value)} className="field" />
            </div>
            <div>
              <label htmlFor="req-end" className="mb-1 block text-[13px] font-bold">{t("Odjezd", "Departure")}</label>
              <input id="req-end" type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} className="field" />
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
            <label htmlFor="req-note" className="mb-1 block text-[13px] font-bold">{t("Poznámka (nepovinné)", "Note (optional)")}</label>
            <textarea id="req-note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="field resize-none" />
          </div>

          {invalid && (
            <p className="rounded-2xl bg-danger-soft p-3 text-[14px] font-semibold text-danger">{t("Odjezd musí být po příjezdu.", "The departure date must be after the arrival date.")}</p>
          )}
          {hasConflict && !invalid && (
            <p className="rounded-2xl bg-warn-soft p-3 text-[14px] font-semibold text-warn">
              {t("Tento termín je již částečně obsazený. Žádost odešlete, správce posoudí kolizi.", "These dates are already partly booked. You can still send the request; the manager will review the conflict.")}
            </p>
          )}

          <button
            onClick={submit}
            disabled={saving || !name.trim() || !emailOk || invalid || !property}
            className="btn-primary w-full disabled:opacity-40"
          >
            {saving ? t("Odesílám…", "Sending…") : t("Odeslat žádost", "Send request")}
          </button>
        </section>
      )}
    </div>
  );
}

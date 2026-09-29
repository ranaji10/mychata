import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, Minus, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/account";
import { CalendarLegend, CalendarMonth, MonthHeader, useMonthNav } from "@/components/calendar";
import {
  findConflicts,
  fmtDate,
  isoDateOrNull,
  pickRange,
  todayISO,
  type Booking,
  type DateRange,
} from "@/lib/data";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/rezervace/nova")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "New booking — My Chata" },
      { name: "description", content: "Book a stay at the cottage." },
      { property: "og:title", content: "New booking — My Chata" },
      { property: "og:description", content: "Book a stay at the cottage." },
    ],
  }),
  // Dates picked on the calendar arrive as ?start=YYYY-MM-DD&end=YYYY-MM-DD (T-021).
  validateSearch: (search: Record<string, unknown>): { start?: string; end?: string } => {
    const start = isoDateOrNull(search["start"]);
    const end = isoDateOrNull(search["end"]);
    return { ...(start ? { start } : {}), ...(end ? { end } : {}) };
  },
  component: NewBooking,
});

function NewBooking() {
  const { property, currentMember } = useAccount();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useLang();

  const search = Route.useSearch();
  const initialStart = search.start && search.start >= todayISO() ? search.start : todayISO();
  const initialEnd = search.end && search.end >= initialStart ? search.end : initialStart;
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  // Tapping on the calendar: first tap arrival, second tap departure.
  const [range, setRange] = useState<DateRange>({ start: initialStart, end: initialEnd });
  const nav = useMonthNav(initialStart);
  const onPickDay = (iso: string) => {
    const next = pickRange(range, iso);
    setRange(next);
    setStart(next.start ?? iso);
    setEnd(next.end ?? next.start ?? iso);
  };
  const [guests, setGuests] = useState(2);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: bookings } = useQuery({
    queryKey: ["bookings", property?.id],
    enabled: !!property,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("property_id", property!.id);
      if (error) throw error;
      return data as Booking[];
    },
  });

  const conflicts = findConflicts(start, end, bookings ?? []);
  const overlaps = conflicts.filter((c) => c.kind === "hard");
  const changeovers = conflicts.filter((c) => c.kind === "same-day");
  const invalid = end < start;

  const save = async () => {
    if (!property || !currentMember || invalid) return;
    setSaving(true);
    const { data: saved, error } = await supabase
      .from("bookings")
      .insert({
        property_id: property.id,
        requester_member_id: currentMember.id,
        requester_name: currentMember.name,
        start_date: start,
        end_date: end,
        guests,
        note: note || null,
        status: "CONFIRMED",
      })
      .select("status")
      .single();
    setSaving(false);
    if (error) {
      toast.error(t("Rezervaci se nepodařilo uložit.", "The booking could not be saved."));
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["bookings", property.id] });
    // Where the chata doesn't auto-confirm, the database keeps a member's booking pending.
    toast.success(
      saved?.status === "PENDING"
        ? t("Rezervace čeká na schválení správcem.", "Booking sent to the admin for approval.")
        : t("Rezervace byla potvrzena.", "Booking confirmed."),
    );
    navigate({ to: "/kalendar" });
  };

  return (
    <AppShell>
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate({ to: "/kalendar" })}
          aria-label={t("Zpět", "Back")}
          className="grid size-11 place-items-center rounded-xl bg-secondary"
        >
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="text-2xl font-bold">{t("Nová rezervace", "New booking")}</h1>
      </div>

      <section className="card mt-4 p-4">
        <MonthHeader {...nav} />
        <p className="mt-2 text-[14px] font-semibold text-muted-foreground">
          {!range.end
            ? t("Teď klepněte na den odjezdu.", "Now tap your departure day.")
            : t(
                "Klepněte na den příjezdu a pak na den odjezdu.",
                "Tap your arrival day, then your departure day.",
              )}
        </p>
        <div className="mt-3">
          <CalendarMonth
            year={nav.year}
            month={nav.month}
            bookings={bookings ?? []}
            selection={range}
            onPickDay={onPickDay}
          />
        </div>
        <CalendarLegend picking />
      </section>

      <section className="card mt-4 space-y-4 p-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="start" className="mb-1 block text-[13px] font-bold">
              {t("Příjezd", "Arrival")}
            </label>
            <input
              id="start"
              type="date"
              value={start}
              min={todayISO()}
              onChange={(e) => {
                setStart(e.target.value);
                setRange({ start: e.target.value, end: end >= e.target.value ? end : null });
              }}
              className="field"
            />
          </div>
          <div>
            <label htmlFor="end" className="mb-1 block text-[13px] font-bold">
              {t("Odjezd", "Departure")}
            </label>
            <input
              id="end"
              type="date"
              value={end}
              min={start}
              onChange={(e) => {
                setEnd(e.target.value);
                setRange({ start, end: e.target.value });
              }}
              className="field"
            />
          </div>
        </div>

        <div>
          <span className="mb-1 block text-[13px] font-bold">
            {t("Počet hostů", "Number of guests")}
          </span>
          <div className="flex items-center gap-4 rounded-2xl border border-border bg-card px-4 py-2">
            <button
              onClick={() => setGuests((g) => Math.max(1, g - 1))}
              aria-label={t("Odebrat hosta", "Remove guest")}
              className="grid size-11 place-items-center rounded-xl bg-secondary"
            >
              <Minus className="size-5" />
            </button>
            <span className="flex-1 text-center text-2xl font-bold">{guests}</span>
            <button
              onClick={() => setGuests((g) => Math.min(20, g + 1))}
              aria-label={t("Přidat hosta", "Add guest")}
              className="grid size-11 place-items-center rounded-xl bg-secondary"
            >
              <Plus className="size-5" />
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="note" className="mb-1 block text-[13px] font-bold">
            {t("Poznámka (nepovinné)", "Note (optional)")}
          </label>
          <textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder={t(
              "Např. dovezu dřevo, přivezu psa…",
              "E.g. bringing firewood, bringing the dog…",
            )}
            className="field resize-none"
          />
        </div>

        {invalid && (
          <p className="rounded-2xl bg-danger-soft p-3 text-[14px] font-semibold text-danger">
            {t("Odjezd musí být po příjezdu.", "Departure must be after arrival.")}
          </p>
        )}

        {overlaps.length > 0 && (
          <div className="rounded-2xl bg-warn-soft p-3 text-[14px] font-semibold text-warn">
            <p>{t("V tomto termínu už pobývá:", "Already staying on these dates:")}</p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              {overlaps.map((conflict) => (
                <li key={`${conflict.other.name}-${conflict.other.start}`}>
                  {conflict.other.name} ({fmtDate(conflict.other.start)} –{" "}
                  {fmtDate(conflict.other.end)})
                </li>
              ))}
            </ul>
            <p className="mt-2">
              {t("Překryv je v rodinném účtu povolen.", "Overlapping family stays are allowed.")}
            </p>
          </div>
        )}

        {changeovers.length > 0 && (
          <div className="flex gap-2 rounded-2xl bg-secondary p-3 text-[14px] font-semibold text-muted-foreground">
            <AlertTriangle className="mt-0.5 size-5 shrink-0" />
            <p>
              {t("Ve stejný den odjíždí", "On the same day, departing:")}{" "}
              {changeovers.map((conflict) => conflict.other.name).join(", ")}.{" "}
              {t("Domluvte si předání chaty.", "Coordinate the cottage handover.")}
            </p>
          </div>
        )}
      </section>

      <button
        onClick={save}
        disabled={saving || invalid}
        className="btn-primary mt-4 w-full disabled:opacity-40"
      >
        {saving ? t("Ukládám…", "Saving…") : t("Potvrdit rezervaci", "Confirm booking")}
      </button>
      <p className="mt-2 text-center text-[13px] text-muted-foreground">
        {t(
          "Rezervace se ihned zapíše do rodinného kalendáře.",
          "The booking is added to the family calendar immediately.",
        )}
      </p>
    </AppShell>
  );
}

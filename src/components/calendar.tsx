import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import { useState } from "react";
import {
  dayNames,
  findConflicts,
  fmtDate,
  monthGrid,
  monthNames,
  todayISO,
  type Booking,
  type DateRange,
} from "@/lib/data";
import { useLang } from "@/lib/i18n";

/**
 * Month grid shared by the members' calendar, the booking form and the public calendar.
 * With `onPickDay` the days become buttons: tap the arrival, then the departure (T-021).
 */
export function CalendarMonth({
  year,
  month,
  bookings,
  selection,
  onPickDay,
  minDate,
  highlight,
}: {
  year: number;
  month: number;
  /** With requester_name (members' views only), booked days name who is there (bug 14). */
  bookings: (Pick<Booking, "start_date" | "end_date" | "status"> & { requester_name?: string })[];
  selection?: DateRange;
  onPickDay?: (iso: string) => void;
  /** Days before this can't be picked (defaults to today when picking). */
  minDate?: string;
  /** Free days worth pointing out (e.g. the next free weekend on the public calendar). */
  highlight?: string[] | undefined;
}) {
  const { lang, t } = useLang();
  const days = monthGrid(year, month);
  const today = todayISO();
  const earliest = minDate ?? today;

  return (
    <div>
      <div className="grid grid-cols-7 text-center">
        {dayNames(lang).map((d) => (
          <span key={d} className="py-2 text-[13px] font-bold text-nav-foreground">
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 text-center">
        {days.map((d) => {
          const dayStays = bookings.filter((b) => d.iso >= b.start_date && d.iso <= b.end_date);
          const booking = dayStays[0];
          const names = [
            ...new Set(dayStays.map((b) => b.requester_name).filter((n): n is string => !!n)),
          ];
          const isToday = d.iso === today;
          const isPending = booking?.status === "PENDING";
          const isConfirmed = booking?.status === "CONFIRMED";
          const isEndpoint = !!selection && (d.iso === selection.start || d.iso === selection.end);
          const inRange =
            !!selection?.start &&
            !!selection.end &&
            d.iso > selection.start &&
            d.iso < selection.end;
          const isHighlighted = !booking && !!highlight?.includes(d.iso);
          const stateClass = isEndpoint
            ? "bg-primary text-primary-foreground rounded-full font-extrabold"
            : inRange
              ? "bg-primary-soft text-primary"
              : isConfirmed
                ? "bg-primary text-primary-foreground font-extrabold"
                : isPending
                  ? "bg-warn-soft text-warn-foreground"
                  : isHighlighted
                    ? "bg-primary-soft text-primary ring-2 ring-primary rounded-[14px]"
                    : !d.inMonth
                      ? "text-subtle"
                      : d.iso < today
                        ? "text-subtle"
                        : "text-foreground";
          const startBand =
            !!booking &&
            (d.iso === booking.start_date ||
              d.iso.slice(8) === "01" ||
              new Date(`${d.iso}T12:00:00`).getDay() === 1);
          const endBand =
            !!booking &&
            (d.iso === booking.end_date || new Date(`${d.iso}T12:00:00`).getDay() === 0);
          const cellClass = `grid h-[44px] min-w-0 place-items-center text-[15px] font-semibold ${stateClass} ${startBand ? "rounded-l-[14px]" : ""} ${endBand ? "rounded-r-[14px]" : ""}`;
          // A day you are picking that someone already booked: a dot, so "your dates" and
          // "booked" no longer look the same (both were solid green).
          const overlapsSelection = !!booking && (isEndpoint || inRange);
          const label = (
            <span
              className={`relative grid size-[42px] place-items-center ${isToday ? "rounded-full font-extrabold ring-2 ring-inset ring-foreground" : ""}`}
            >
              {d.day}
              {overlapsSelection && (
                <span
                  aria-hidden="true"
                  className="absolute bottom-1 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-warn"
                />
              )}
            </span>
          );
          // Desktop: hover a booked day to see who is staying (bug 14). Touch screens get the
          // same names in OverlapNotice under the calendar, without an extra tap.
          const tooltip =
            names.length > 0 ? (
              <span
                role="tooltip"
                className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-xl bg-foreground px-2.5 py-1.5 text-[13px] font-semibold text-background shadow-lg [@media(hover:hover)]:group-hover:block"
              >
                {names.join(", ")}
              </span>
            ) : null;
          const booked = names.length
            ? ` · ${t("obsazeno", "booked")}: ${names.join(", ")}`
            : booking
              ? ` · ${t("obsazeno", "booked")}`
              : "";
          if (!onPickDay) {
            return (
              <div
                key={d.iso}
                className={`${cellClass} group relative`}
                {...(names.length ? { "aria-label": `${d.day}${booked}` } : {})}
              >
                {label}
                {tooltip}
              </div>
            );
          }
          const disabled = d.iso < earliest;
          return (
            <Button
              variant="fresh"
              size="fresh"
              key={d.iso}
              type="button"
              disabled={disabled}
              onClick={() => onPickDay(d.iso)}
              aria-pressed={isEndpoint}
              aria-label={`${d.day}. ${monthNames(lang)[Number(d.iso.slice(5, 7)) - 1]}${booked}`}
              className={`${cellClass} group relative overflow-visible active:scale-95 disabled:cursor-not-allowed`}
            >
              {label}
              {tooltip}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

/** Month title with previous/next buttons; keeps its own year and month. */
export function useMonthNav(initial?: string | null) {
  const base = initial ? new Date(`${initial}T00:00:00`) : new Date();
  const [ym, setYm] = useState({ year: base.getFullYear(), month: base.getMonth() });
  const prev = () =>
    setYm(({ year, month }) =>
      month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 },
    );
  const next = () =>
    setYm(({ year, month }) =>
      month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 },
    );
  return { ...ym, prev, next };
}

export function MonthHeader({
  year,
  month,
  prev,
  next,
}: {
  year: number;
  month: number;
  prev: () => void;
  next: () => void;
}) {
  const { t, lang } = useLang();
  return (
    <div className="relative flex items-center justify-between">
      <h2 className="absolute inset-x-11 text-center text-[18px] font-extrabold">
        {monthNames(lang)[month]} {year}
      </h2>
      <div className="flex w-full justify-between">
        <Button
          variant="fresh"
          size="fresh"
          type="button"
          onClick={prev}
          aria-label={t("Předchozí měsíc", "Previous month")}
          className="grid size-11 place-items-center rounded-full bg-secondary"
        >
          <ChevronLeft className="size-5" />
        </Button>
        <Button
          variant="fresh"
          size="fresh"
          type="button"
          onClick={next}
          aria-label={t("Další měsíc", "Next month")}
          className="grid size-11 place-items-center rounded-full bg-secondary"
        >
          <ChevronRight className="size-5" />
        </Button>
      </div>
    </div>
  );
}

export function CalendarLegend({ picking = false }: { picking?: boolean }) {
  const { t } = useLang();
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] font-semibold text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span className="size-3 rounded-[4px] bg-primary" />
        {t("Potvrzeno", "Confirmed")}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-3 rounded-[4px] border border-warn-border bg-warn-soft" />
        {t("Čeká na schválení", "Awaiting approval")}
      </span>
      {picking && (
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-full bg-primary" />
          {t("Váš výběr", "Your dates")}
        </span>
      )}
      {picking && (
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-warn" />
          {t("Už obsazeno", "Already booked")}
        </span>
      )}
    </div>
  );
}

/**
 * Who already stays on the dates being picked, shown right under the calendar as soon as the
 * dates overlap (bug 14: on a phone the warning was only at the bottom of the form).
 */
export function OverlapNotice({
  selection,
  bookings,
}: {
  selection: DateRange;
  bookings: { requester_name: string; start_date: string; end_date: string }[];
}) {
  const { t } = useLang();
  if (!selection.start) return null;
  const end = selection.end ?? selection.start;
  const hard = findConflicts(selection.start, end, bookings).filter((c) => c.kind === "hard");
  if (!hard.length) return null;
  return (
    <div
      role="status"
      className="mt-3 flex gap-2 rounded-2xl bg-warn-soft p-3 text-[16px] font-semibold text-warn-foreground"
    >
      <Info className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <div>
        <p>{t("Tyto dny už má rezervované:", "Already booked on these dates:")}</p>
        <ul className="mt-1 space-y-0.5">
          {hard.map((c) => (
            <li key={`${c.other.name}-${c.other.start}`}>
              {c.other.name} · {fmtDate(c.other.start)} – {fmtDate(c.other.end)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

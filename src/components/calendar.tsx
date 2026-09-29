import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import {
  dayNames,
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
}: {
  year: number;
  month: number;
  bookings: Booking[];
  selection?: DateRange;
  onPickDay?: (iso: string) => void;
  /** Days before this can't be picked (defaults to today when picking). */
  minDate?: string;
}) {
  const { lang, t } = useLang();
  const days = monthGrid(year, month);
  const today = todayISO();
  const earliest = minDate ?? today;

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {dayNames(lang).map((d) => (
          <span key={d} className="py-1 text-[12px] font-bold text-muted-foreground">
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {days.map((d) => {
          const booking = bookings.find((b) => d.iso >= b.start_date && d.iso <= b.end_date);
          const isToday = d.iso === today;
          const isPending = booking?.status === "PENDING";
          const isConfirmed = booking?.status === "CONFIRMED";
          const isEndpoint = !!selection && (d.iso === selection.start || d.iso === selection.end);
          const inRange =
            !!selection?.start &&
            !!selection.end &&
            d.iso > selection.start &&
            d.iso < selection.end;
          const style = isEndpoint
            ? { backgroundColor: "var(--color-primary)", color: "var(--color-primary-foreground)" }
            : inRange
              ? {
                  backgroundColor: "var(--color-primary-soft)",
                  color: "var(--color-primary)",
                  boxShadow: booking ? "inset 0 -4px 0 var(--color-ok)" : undefined,
                }
              : isConfirmed
                ? { backgroundColor: "var(--color-ok)", color: "#fff" }
                : isPending
                  ? { backgroundColor: "var(--color-warn-soft)", color: "var(--color-warn)" }
                  : isToday
                    ? { boxShadow: "inset 0 0 0 2px var(--color-primary)" }
                    : undefined;
          const label = (
            <span
              className={!booking && !d.inMonth && !isEndpoint ? "text-muted-foreground/50" : ""}
            >
              {d.day}
            </span>
          );
          if (!onPickDay) {
            return (
              <div
                key={d.iso}
                className="grid h-11 place-items-center rounded-xl text-[15px] font-semibold"
                style={style}
              >
                {label}
              </div>
            );
          }
          const disabled = d.iso < earliest;
          return (
            <button
              key={d.iso}
              type="button"
              disabled={disabled}
              onClick={() => onPickDay(d.iso)}
              aria-pressed={isEndpoint}
              aria-label={`${d.day}. ${monthNames(lang)[Number(d.iso.slice(5, 7)) - 1]}${
                booking ? ` · ${t("obsazeno", "booked")}` : ""
              }`}
              className="grid h-11 place-items-center rounded-xl text-[15px] font-semibold active:scale-95 disabled:cursor-not-allowed disabled:opacity-35"
              style={style}
            >
              {label}
            </button>
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
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-bold">
        {monthNames(lang)[month]} {year}
      </h2>
      <div className="flex gap-1">
        <button
          type="button"
          onClick={prev}
          aria-label={t("Předchozí měsíc", "Previous month")}
          className="grid size-11 place-items-center rounded-xl bg-secondary"
        >
          <ChevronLeft className="size-5" />
        </button>
        <button
          type="button"
          onClick={next}
          aria-label={t("Další měsíc", "Next month")}
          className="grid size-11 place-items-center rounded-xl bg-secondary"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>
    </div>
  );
}

export function CalendarLegend({ picking = false }: { picking?: boolean }) {
  const { t } = useLang();
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] font-semibold text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span className="size-3 rounded bg-ok" />
        {t("Potvrzeno", "Confirmed")}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-3 rounded bg-warn" />
        {t("Čeká na schválení", "Awaiting approval")}
      </span>
      {picking && (
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded bg-primary" />
          {t("Váš výběr", "Your dates")}
        </span>
      )}
    </div>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Link2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { EmptyState, Skeleton } from "@/components/bits";
import { CalendarLegend, CalendarMonth, MonthHeader, useMonthNav } from "@/components/calendar";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/account";
import { fmtDate, pickRange, todayISO, type Booking, type DateRange } from "@/lib/data";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/kalendar")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Calendar — My Chata" },
      {
        name: "description",
        content: "Shared cottage stay calendar with an overview of availability.",
      },
      { property: "og:title", content: "Calendar — My Chata" },
      {
        property: "og:description",
        content: "Shared cottage stay calendar with an overview of availability.",
      },
    ],
  }),
  // /kalendar?book=1 (from "Book a date"): open straight into picking the dates.
  validateSearch: (search: Record<string, unknown>): { book?: boolean } =>
    search["book"] === true || search["book"] === "true" || search["book"] === 1
      ? { book: true }
      : {},
  component: CalendarPage,
});

function CalendarPage() {
  const { t } = useLang();
  const { account, property } = useAccount();
  const { book } = Route.useSearch();
  const navigate = useNavigate();
  const nav = useMonthNav();
  const [picking, setPicking] = useState(!!book);
  const [range, setRange] = useState<DateRange>({ start: null, end: null });
  const calendarRef = useRef<HTMLElement>(null);

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["bookings", property?.id],
    enabled: !!property,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("property_id", property!.id)
        .order("start_date");
      if (error) throw error;
      return data as Booking[];
    },
  });

  const isFamily = account?.type === "FAMILY";

  const startPicking = () => {
    setPicking(true);
    calendarRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  useEffect(() => {
    if (book) calendarRef.current?.scrollIntoView({ block: "start" });
  }, [book]);

  const onPickDay = (iso: string) => {
    setPicking(true);
    setRange((r) => pickRange(r, iso));
  };
  const clearRange = () => {
    setRange({ start: null, end: null });
    setPicking(false);
  };
  const continueToBooking = () => {
    if (!range.start) return;
    navigate({
      to: "/rezervace/nova",
      search: { start: range.start, end: range.end ?? range.start },
    });
  };

  const copyPublicLink = async () => {
    // Publishing the calendar is an explicit admin action; the link uses the share token.
    const { data: publicToken, error: publishError } = await supabase.rpc("set_public_calendar", {
      _property_id: property!.id,
      _enabled: true,
    });
    if (publishError || !publicToken) {
      toast.error(
        t("Veřejný kalendář může zapnout jen správce.", "Only an admin can publish the calendar."),
      );
      return;
    }
    const url = `${window.location.origin}/verejne/kalendar/${publicToken}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t("Odkaz na veřejný kalendář zkopírován.", "Public calendar link copied."));
    } catch {
      toast.info(url);
    }
  };

  const upcoming = (bookings ?? []).filter((b) => b.end_date >= todayISO());

  return (
    <AppShell>
      <section ref={calendarRef} className="card mt-2 scroll-mt-4 p-4">
        <MonthHeader {...nav} />

        {isFamily && picking && (
          <p className="mt-3 rounded-2xl bg-primary-soft p-3 text-[14px] font-semibold text-primary">
            {!range.start
              ? t("Klepněte na den příjezdu.", "Tap your arrival day.")
              : !range.end
                ? t(
                    `Příjezd ${fmtDate(range.start)}. Teď klepněte na den odjezdu.`,
                    `Arrival ${fmtDate(range.start)}. Now tap your departure day.`,
                  )
                : t(
                    `${fmtDate(range.start)} – ${fmtDate(range.end)}. Pokračujte, nebo klepněte znovu pro jiný termín.`,
                    `${fmtDate(range.start)} – ${fmtDate(range.end)}. Continue, or tap again to choose other dates.`,
                  )}
          </p>
        )}

        <div className="mt-3">
          {isLoading ? (
            <Skeleton className="h-64" />
          ) : (
            <CalendarMonth
              year={nav.year}
              month={nav.month}
              bookings={bookings ?? []}
              {...(isFamily ? { selection: range, onPickDay } : {})}
            />
          )}
        </div>

        <CalendarLegend picking={isFamily && !!range.start} />

        {isFamily &&
          (range.start ? (
            <div className="mt-4 flex gap-2">
              <button onClick={continueToBooking} className="btn-primary flex-1">
                {range.end
                  ? t("Pokračovat k rezervaci", "Continue to booking")
                  : t("Jen jeden den", "Just this one day")}
              </button>
              <button
                onClick={clearRange}
                className="grid size-11 shrink-0 place-items-center self-center rounded-xl bg-secondary"
                aria-label={t("Zrušit výběr", "Clear the dates")}
              >
                <X className="size-5" />
              </button>
            </div>
          ) : (
            !picking && (
              <button onClick={startPicking} className="btn-primary mt-4 w-full">
                {t("Rezervovat termín", "Book a date")}
              </button>
            )
          ))}
      </section>

      <section className="mt-4">
        <h3 className="mb-2 text-lg font-bold">{t("Nadcházející pobyty", "Upcoming stays")}</h3>
        {isLoading ? (
          <Skeleton className="h-24" />
        ) : upcoming.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title={t("Zatím žádné rezervace.", "No bookings yet.")}
            hint={
              isFamily
                ? t("Buďte první, kdo naplánuje pobyt.", "Be the first to plan a stay.")
                : t("Schválené žádosti se zde zobrazí.", "Approved requests will appear here.")
            }
            action={
              isFamily ? (
                <button onClick={startPicking} className="btn-primary w-full">
                  {t("Rezervovat termín", "Book a date")}
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-2.5">
            {upcoming.map((b) => (
              <Link
                key={b.id}
                to="/rezervace/$id"
                params={{ id: b.id }}
                className="card flex items-center gap-3 p-3 active:scale-[0.99]"
              >
                <span
                  className="size-3 shrink-0 rounded-full"
                  style={{
                    backgroundColor:
                      b.status === "PENDING" ? "var(--color-warn)" : "var(--color-ok)",
                  }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-bold">{b.requester_name}</p>
                  <p className="text-[13px] text-muted-foreground">
                    {fmtDate(b.start_date)} – {fmtDate(b.end_date)} · {b.guests}{" "}
                    {t("hostů", "guests")}
                  </p>
                </div>
                {b.status === "PENDING" && (
                  <span className="pill bg-warn-soft text-warn">{t("Čeká", "Waiting")}</span>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>

      {isFamily && (
        <button
          onClick={copyPublicLink}
          className="card mt-4 flex w-full items-center gap-3 p-4 text-left active:scale-[0.99]"
        >
          <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-secondary text-muted-foreground">
            <Link2 className="size-5" />
          </div>
          <div className="flex-1">
            <p className="text-[15px] font-bold">
              {t("Veřejný odkaz na kalendář", "Public calendar link")}
            </p>
            <p className="text-[13px] text-muted-foreground">
              {t(
                "Pro členy bez aplikace — pouze ke čtení",
                "For members without the app — read only",
              )}
            </p>
          </div>
        </button>
      )}
    </AppShell>
  );
}

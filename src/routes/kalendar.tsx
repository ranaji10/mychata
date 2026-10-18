import { Button } from "@/components/ui/button";
import { ManualCopyLink } from "@/components/ManualCopyLink";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Link2, Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { EmptyState, Skeleton } from "@/components/bits";
import {
  CalendarLegend,
  CalendarMonth,
  MonthHeader,
  OverlapNotice,
  useMonthNav,
} from "@/components/calendar";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/account";
import { fmtDate, guestCount, pickRange, todayISO, type Booking, type DateRange } from "@/lib/data";
import { usePendingGuestRequests } from "@/lib/guest-requests";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/kalendar")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Kalendář — My Chata" },
      {
        name: "description",
        content: "Shared cottage stay calendar with an overview of availability.",
      },
      { property: "og:title", content: "Kalendář — My Chata" },
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
  const { t, lang } = useLang();
  const { account, property, currentMember } = useAccount();
  const isAdmin = currentMember?.role === "ADMIN" || currentMember?.role === "OWNER";
  const { book } = Route.useSearch();
  const navigate = useNavigate();
  const nav = useMonthNav();
  const [view, setView] = useState<"month" | "list">("month");
  const [manualLink, setManualLink] = useState<string | null>(null);
  const [picking, setPicking] = useState(!!book);
  const [range, setRange] = useState<DateRange>({ start: null, end: null });
  const calendarRef = useRef<HTMLElement>(null);

  const {
    data: bookings,
    isLoading,
    isError,
    refetch,
  } = useQuery({
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

  // Guest requests are not bookings until an admin approves them, but the admin should see
  // them on the calendar as "Awaiting approval", as the legend says (T-026). Members don't
  // see guest requests at all (row-level security), so nothing changes for them.
  const { data: guestRequests } = usePendingGuestRequests(property?.id, isAdmin);
  const calendarStays = [
    ...(bookings ?? []),
    ...(guestRequests ?? []).map((g) => ({
      start_date: g.start_date,
      end_date: g.end_date,
      status: "PENDING" as const,
      requester_name: g.guest_name,
    })),
  ];

  const startPicking = () => {
    setPicking(true);
    setView("month");
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
    setManualLink(null);
    // Publishing the calendar is an explicit admin action; the link uses the share token.
    // A member only passes on a link that is already published (T-038: it used to fail with 403).
    const { data: publicToken, error: publishError } = isAdmin
      ? await supabase.rpc("set_public_calendar", { _property_id: property!.id, _enabled: true })
      : { data: property!.public_token, error: null };
    if (publishError || !publicToken) {
      toast.error(
        t("Veřejný kalendář může zapnout jen správce.", "Only an admin can publish the calendar."),
      );
      return;
    }
    const url = `${window.location.origin}/verejne/kalendar/${publicToken}`;
    try {
      await navigator.clipboard.writeText(url);
      setManualLink(null);
      toast.success(t("Odkaz na veřejný kalendář zkopírován.", "Public calendar link copied."));
    } catch {
      setManualLink(url);
    }
  };

  const upcoming = (bookings ?? []).filter((b) => b.end_date >= todayISO());

  return (
    <AppShell>
      <div className="mb-5 mt-2 flex items-center justify-between gap-3">
        <h2 className="text-[28px] font-extrabold leading-[1.15]">{t("Kalendář", "Calendar")}</h2>
        {isFamily && (
          <Button
            variant="fresh"
            size="fresh"
            onClick={startPicking}
            className="btn-primary min-h-[44px] px-4 py-2 text-[16px]"
          >
            <Plus className="size-[18px]" />
            {t("Pobyt", "Stay")}
          </Button>
        )}
      </div>
      <div
        role="group"
        aria-label={t("Zobrazení kalendáře", "Calendar view")}
        className="mb-4 flex gap-2"
      >
        {(["month", "list"] as const).map((v) => (
          <Button
            variant="fresh"
            size="fresh"
            key={v}
            aria-pressed={view === v}
            onClick={() => setView(v)}
            className={`min-h-11 rounded-full px-5 text-[14px] ${view === v ? "bg-foreground text-primary-foreground font-bold" : "bg-card text-foreground font-semibold"}`}
          >
            {v === "month" ? t("Měsíc", "Month") : t("Seznam", "List")}
          </Button>
        ))}
      </div>
      <section
        ref={calendarRef}
        hidden={view !== "month"}
        className="card mt-2 scroll-mt-4 rounded-[24px] p-4"
      >
        <MonthHeader {...nav} />

        {isFamily && picking && (
          <p className="mt-3 rounded-2xl bg-primary-soft p-3 text-[16px] font-semibold text-primary">
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
          ) : isError && !bookings ? (
            <div role="alert" className="rounded-2xl bg-secondary p-4">
              <p className="font-bold">
                {t("Kalendář se nepodařilo načíst.", "Could not load the calendar.")}
              </p>
              <Button
                variant="fresh"
                size="fresh"
                onClick={() => void refetch()}
                className="btn-secondary mt-3 w-full"
              >
                {t("Zkusit znovu", "Try again")}
              </Button>
            </div>
          ) : (
            <CalendarMonth
              year={nav.year}
              month={nav.month}
              bookings={calendarStays}
              {...(isFamily ? { selection: range, onPickDay } : {})}
            />
          )}
        </div>

        <CalendarLegend picking={isFamily && !!range.start} />
        {isFamily && <OverlapNotice selection={range} bookings={calendarStays} />}

        {isFamily && range.start && (
          <div className="mt-4 flex gap-2">
            <Button
              variant="fresh"
              size="fresh"
              onClick={continueToBooking}
              className="btn-primary flex-1"
            >
              {range.end
                ? t("Pokračovat k rezervaci", "Continue to booking")
                : t("Jen jeden den", "Just this one day")}
            </Button>
            <Button
              variant="fresh"
              size="fresh"
              onClick={clearRange}
              className="grid size-11 shrink-0 place-items-center self-center rounded-full bg-secondary"
              aria-label={t("Zrušit výběr", "Clear the dates")}
            >
              <X className="size-5" />
            </Button>
          </div>
        )}
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
          />
        ) : (
          <div className="space-y-2.5">
            {upcoming.map((b) => (
              <Link
                key={b.id}
                to="/rezervace/$id"
                params={{ id: b.id }}
                className="card flex items-center gap-3 rounded-[20px] p-[14px] active:scale-[0.99]"
              >
                <span
                  className={`grid size-11 shrink-0 place-items-center rounded-[14px] font-extrabold ${b.status === "PENDING" ? "bg-warn-soft text-warn-foreground" : "bg-primary-soft text-primary"}`}
                >
                  {Number(b.start_date.slice(8))}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[16px] font-bold">{b.requester_name}</p>
                  <p className="text-[16px] text-muted-foreground">
                    {fmtDate(b.start_date)} – {fmtDate(b.end_date)} · {guestCount(b.guests, lang)}
                  </p>
                </div>
                {b.status === "PENDING" && (
                  <span className="pill bg-warn-soft text-warn-foreground">
                    {t("Čeká", "Waiting")}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>

      {isFamily && (isAdmin || property?.public_calendar_enabled) && (
        <>
          <Button
            variant="fresh"
            size="fresh"
            onClick={copyPublicLink}
            className="card mt-4 flex w-full items-center gap-3 p-4 text-left active:scale-[0.99]"
          >
            <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-secondary text-muted-foreground">
              <Link2 className="size-5" />
            </div>
            <div className="flex-1">
              <p className="text-[16px] font-bold">
                {t("Veřejný odkaz na kalendář", "Public calendar link")}
              </p>
              <p className="text-[16px] text-muted-foreground">
                {t(
                  "Pro členy bez aplikace — pouze ke čtení",
                  "For members without the app — read only",
                )}
              </p>
            </div>
          </Button>
          <ManualCopyLink url={manualLink} />
        </>
      )}
    </AppShell>
  );
}

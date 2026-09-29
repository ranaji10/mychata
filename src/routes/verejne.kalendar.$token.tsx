import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarPlus, Share2, Sun } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/bits";
import { CalendarLegend, CalendarMonth, MonthHeader, useMonthNav } from "@/components/calendar";
import { supabase } from "@/integrations/supabase/client";
import { fmtDate, todayISO, type Booking } from "@/lib/data";
import { LanguageToggle, useLang } from "@/lib/i18n";

export const Route = createFileRoute("/verejne/kalendar/$token")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Public calendar — My Chata" },
      { name: "description", content: "Public overview of cottage availability — read only." },
      { property: "og:title", content: "Public calendar — My Chata" },
      {
        property: "og:description",
        content: "Public overview of cottage availability — read only.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PublicCalendar,
});

/** The next Saturday (from today on) whose Saturday and Sunday are both free. */
function nextFreeWeekend(bookings: Booking[]): { start: string; end: string } | null {
  const toISO = (d: Date) => d.toISOString().slice(0, 10);
  const start = new Date(`${todayISO()}T00:00:00`);
  for (let i = 0; i < 366; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    if (day.getDay() !== 6) continue; // Saturdays only
    const sun = new Date(day);
    sun.setDate(day.getDate() + 1);
    const sat = toISO(day);
    const sunday = toISO(sun);
    const busy = bookings.some((b) => b.start_date <= sunday && b.end_date >= sat);
    if (!busy) return { start: sat, end: sunday };
  }
  return null;
}

function PublicCalendar() {
  const { t, lang } = useLang();
  const { token } = Route.useParams();
  const nav = useMonthNav();

  // Public pages are addressed by the property's share token, never its id (migration 0012).
  const { data: property, isLoading: loadingProperty } = useQuery({
    queryKey: ["public-property", token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("public_property", { _token: token });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["public-cal-bookings", token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("public_calendar", { _token: token });
      if (error) throw error;
      return (data ?? []).map((booking, i) => ({
        id: `public-${i}`,
        property_id: "",
        start_date: booking.start_date,
        end_date: booking.end_date,
        status: booking.status,
        requester_name: "",
        requester_member_id: null,
        guests: 0,
        note: null,
        created_at: "",
        updated_at: "",
      })) as Booking[];
    },
  });

  const list = bookings ?? [];
  const upcoming = list.filter((b) => b.end_date >= todayISO());
  const freeWeekend = nextFreeWeekend(list);

  const month = nav.month; // 0-based
  const season =
    month === 11 || month <= 1
      ? { cs: "zima", en: "winter" }
      : month <= 4
        ? { cs: "jaro", en: "spring" }
        : month <= 7
          ? { cs: "léto", en: "summer" }
          : { cs: "podzim", en: "autumn" };

  const share = async () => {
    const url = window.location.href;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ url, title: property?.property_name ?? "My Chata" });
        return;
      } catch {
        // Share sheet dismissed — fall through to copying.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t("Odkaz zkopírován", "Link copied"));
    } catch {
      toast.error(t("Odkaz se nepodařilo zkopírovat.", "The link could not be copied."));
    }
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-[420px] bg-background px-4 py-4 pb-8">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-2xl font-bold">
          {property?.property_name ?? t("Kalendář chaty", "Cottage calendar")}
        </h1>
        <LanguageToggle className="shrink-0" />
      </div>
      <p className="mt-1 text-[14px] text-muted-foreground">
        {t("Podívejte se, kdy je chata volná.", "See when the cottage is free.")}
      </p>

      {!loadingProperty && !property && (
        <p className="card mt-4 p-4 text-[15px]">
          {t(
            "Tento odkaz na kalendář neplatí. Požádejte správce chaty o aktuální odkaz.",
            "This calendar link is not valid. Ask the cottage's administrator for the current link.",
          )}
        </p>
      )}
      {property && !property.calendar_enabled && (
        <p className="card mt-4 p-4 text-[15px]">
          {t(
            "Správce tento kalendář nezveřejnil.",
            "The cottage admin has not made this calendar public.",
          )}
        </p>
      )}

      {property?.calendar_enabled && (
        <>
          {freeWeekend && (
            <div className="card mt-4 flex items-center gap-3 bg-ok-soft p-4">
              <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-ok text-white">
                <Sun className="size-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-muted-foreground">
                  {t("Nejbližší volný víkend", "Next free weekend")}
                </p>
                <p className="text-[15px] font-bold">
                  {fmtDate(freeWeekend.start)} – {fmtDate(freeWeekend.end)}
                </p>
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center gap-2">
            <span className="pill bg-secondary text-muted-foreground">
              <Sun className="size-4" />
              {t(`Sezóna: ${season.cs}`, `Season: ${season.en}`)}
            </span>
            <button onClick={share} className="btn-secondary ml-auto">
              <Share2 className="size-5" /> {t("Sdílet", "Share")}
            </button>
          </div>

          <section className="card mt-3 p-4">
            <MonthHeader {...nav} />
            <div className="mt-3">
              {isLoading ? (
                <Skeleton className="h-64" />
              ) : (
                <CalendarMonth
                  year={nav.year}
                  month={nav.month}
                  bookings={list}
                  highlight={freeWeekend ? [freeWeekend.start, freeWeekend.end] : undefined}
                />
              )}
            </div>
            <CalendarLegend />
            <p className="mt-2 text-[12px] font-semibold text-muted-foreground">
              {t("Zeleně zvýrazněno: volný víkend", "Green outline: free weekend")}
            </p>
          </section>

          <section className="mt-4">
            <h3 className="mb-2 text-lg font-bold">{t("Nadcházející pobyty", "Upcoming stays")}</h3>
            <div className="space-y-2.5">
              {upcoming.map((b) => (
                <div key={b.id} className="card flex items-center gap-3 p-3">
                  <span
                    className="size-3 shrink-0 rounded-full"
                    style={{
                      backgroundColor:
                        b.status === "PENDING" ? "var(--color-warn)" : "var(--color-ok)",
                    }}
                  />
                  <p className="text-[15px] font-semibold">
                    {fmtDate(b.start_date)} – {fmtDate(b.end_date)}
                  </p>
                </div>
              ))}
              {upcoming.length === 0 && (
                <div className="card flex items-center gap-3 p-4">
                  <CalendarPlus className="size-5 shrink-0 text-ok" />
                  <p className="text-[15px] font-semibold">
                    {t(
                      "Chata je zatím volná — pořiďte si termín!",
                      "The cottage is still free — grab a date!",
                    )}
                  </p>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

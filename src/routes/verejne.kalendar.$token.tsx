import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
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

function PublicCalendar() {
  const { t } = useLang();
  const { token } = Route.useParams();
  const nav = useMonthNav();

  // Public pages are addressed by the property's share token, never its id (migration 0012).
  const { data: property } = useQuery({
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

  const upcoming = (bookings ?? []).filter((b) => b.end_date >= todayISO());

  return (
    <div className="mx-auto min-h-screen w-full max-w-[420px] bg-background px-4 py-4 pb-8">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-2xl font-bold">
          {property?.property_name ?? t("Kalendář chaty", "Cottage calendar")}
        </h1>
        <LanguageToggle className="shrink-0" />
      </div>
      <p className="mt-1 text-[14px] text-muted-foreground">
        {t(
          "Veřejný přehled obsazenosti — pouze ke čtení.",
          "Public overview of availability — read only.",
        )}
      </p>
      {property && !property.calendar_enabled && (
        <p className="card mt-4 p-4 text-[15px]">
          {t(
            "Správce tento kalendář nezveřejnil.",
            "The cottage admin has not made this calendar public.",
          )}
        </p>
      )}

      <section className="card mt-4 p-4">
        <MonthHeader {...nav} />
        <div className="mt-3">
          {isLoading ? (
            <Skeleton className="h-64" />
          ) : (
            <CalendarMonth year={nav.year} month={nav.month} bookings={bookings ?? []} />
          )}
        </div>
        <CalendarLegend />
      </section>

      <section className="mt-4">
        <h3 className="mb-2 text-lg font-bold">{t("Nadcházející pobyty", "Upcoming stays")}</h3>
        <div className="space-y-2.5">
          {upcoming.map((b) => (
            <div key={b.id} className="card flex items-center gap-3 p-3">
              <span
                className="size-3 shrink-0 rounded-full"
                style={{
                  backgroundColor: b.status === "PENDING" ? "var(--color-warn)" : "var(--color-ok)",
                }}
              />
              <p className="text-[15px] font-semibold">
                {fmtDate(b.start_date)} – {fmtDate(b.end_date)}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { CalendarMonth } from "@/routes/kalendar";
import { Skeleton } from "@/components/bits";
import { supabase } from "@/integrations/supabase/client";
import { monthNames, fmtDate, todayISO, type Booking, type Property } from "@/lib/data";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/verejne/kalendar/$propertyId")({
  head: () => ({
    meta: [
      { title: "Public calendar — My Chata" },
      { name: "description", content: "Public overview of cottage availability — read only." },
      { property: "og:title", content: "Public calendar — My Chata" },
      { property: "og:description", content: "Public overview of cottage availability — read only." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PublicCalendar,
});

function PublicCalendar() {
  const { t, lang } = useLang();
  const { propertyId } = Route.useParams();
  const now = new Date();
  const [ym, setYm] = useState({ year: now.getFullYear(), month: now.getMonth() });

  const { data: property } = useQuery({
    queryKey: ["public-property", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("properties").select("*").eq("id", propertyId).single();
      if (error) throw error;
      return data as Property;
    },
  });

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["public-cal-bookings", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("property_id", propertyId)
        .in("status", ["CONFIRMED", "PENDING"])
        .order("start_date");
      if (error) throw error;
      return data as Booking[];
    },
  });

  const branches = useMemo(() => [...new Set((bookings ?? []).map((b) => b.requester_name))], [bookings]);

  const prev = () => setYm(({ year, month }) => (month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 }));
  const next = () => setYm(({ year, month }) => (month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 }));

  const upcoming = (bookings ?? []).filter((b) => b.end_date >= todayISO());

  return (
    <div className="mx-auto min-h-screen w-full max-w-[420px] bg-background px-4 py-4 pb-8">
      <h1 className="text-2xl font-bold">{property?.name ?? t("Kalendář chaty", "Cottage calendar")}</h1>
      <p className="mt-1 text-[14px] text-muted-foreground">{t("Veřejný přehled obsazenosti — pouze ke čtení.", "Public overview of availability — read only.")}</p>

      <section className="card mt-4 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">
            {monthNames(lang)[ym.month]} {ym.year}
          </h2>
          <div className="flex gap-1">
            <button onClick={prev} aria-label={t("Předchozí měsíc", "Previous month")} className="grid size-11 place-items-center rounded-xl bg-secondary">
              <ChevronLeft className="size-5" />
            </button>
            <button onClick={next} aria-label={t("Další měsíc", "Next month")} className="grid size-11 place-items-center rounded-xl bg-secondary">
              <ChevronRight className="size-5" />
            </button>
          </div>
        </div>
        <div className="mt-3">
          {isLoading ? (
            <Skeleton className="h-64" />
          ) : (
            <CalendarMonth year={ym.year} month={ym.month} bookings={bookings ?? []} branches={branches} />
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] font-semibold text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-ok" />{t("Potvrzeno", "Confirmed")}</span>
          <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-warn" />{t("Čeká na schválení", "Awaiting approval")}</span>
        </div>
      </section>

      <section className="mt-4">
        <h3 className="mb-2 text-lg font-bold">{t("Nadcházející pobyty", "Upcoming stays")}</h3>
        <div className="space-y-2.5">
          {upcoming.map((b) => (
            <div key={b.id} className="card flex items-center gap-3 p-3">
              <span
                className="size-3 shrink-0 rounded-full"
                style={{ backgroundColor: b.status === "PENDING" ? "var(--color-warn)" : "var(--color-ok)" }}
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

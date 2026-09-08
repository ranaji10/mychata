import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ChevronLeft, ChevronRight, Link2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { EmptyState, Skeleton } from "@/components/bits";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/account";
import {
  branchColor, CZ_DAYS, CZ_MONTHS, fmtDate, monthGrid, todayISO,
  type Booking,
} from "@/lib/data";

export const Route = createFileRoute("/kalendar")({
  head: () => ({
    meta: [
      { title: "Kalendář — My Chata" },
      { name: "description", content: "Sdílený kalendář pobytů chaty s přehledem obsazenosti." },
      { property: "og:title", content: "Kalendář — My Chata" },
      { property: "og:description", content: "Sdílený kalendář pobytů chaty s přehledem obsazenosti." },
    ],
  }),
  component: CalendarPage,
});

export function CalendarMonth({
  year, month, bookings, branches,
}: {
  year: number;
  month: number;
  bookings: Booking[];
  branches: string[];
}) {
  const days = monthGrid(year, month);
  const today = todayISO();

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {CZ_DAYS.map((d) => (
          <span key={d} className="py-1 text-[12px] font-bold text-muted-foreground">{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {days.map((d) => {
          const booking = bookings.find((b) => d.iso >= b.start_date && d.iso <= b.end_date);
          const color = booking ? branchColor(booking.requester_name, branches) : undefined;
          const isToday = d.iso === today;
          return (
            <div
              key={d.iso}
              className="grid h-11 place-items-center rounded-xl text-[15px] font-semibold"
              style={
                booking
                  ? {
                      backgroundColor: booking.status === "PENDING" ? color + "33" : color,
                      color: booking.status === "PENDING" ? color : "#fff",
                    }
                  : isToday
                    ? { boxShadow: "inset 0 0 0 2px var(--color-primary)" }
                    : undefined
              }
            >
              <span className={!booking && !d.inMonth ? "text-muted-foreground/50" : ""}>{d.day}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CalendarPage() {
  const { account, property, members } = useAccount();
  const now = new Date();
  const [ym, setYm] = useState({ year: now.getFullYear(), month: now.getMonth() });

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

  const branches = useMemo(() => {
    if (account?.type === "INSTITUTIONAL") return [...new Set(bookings?.map((b) => b.requester_name) ?? [])];
    return members.map((m) => m.name);
  }, [account, members, bookings]);

  const isFamily = account?.type === "FAMILY";

  const prev = () => setYm(({ year, month }) => (month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 }));
  const next = () => setYm(({ year, month }) => (month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 }));

  const copyPublicLink = async () => {
    const url = `${window.location.origin}/verejne/kalendar/${property!.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Odkaz na veřejný kalendář zkopírován.");
    } catch {
      toast.info(url);
    }
  };

  const upcoming = (bookings ?? []).filter((b) => b.end_date >= todayISO());

  return (
    <AppShell>
      <section className="card mt-2 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">
            {CZ_MONTHS[ym.month]} {ym.year}
          </h2>
          <div className="flex gap-1">
            <button onClick={prev} aria-label="Předchozí měsíc" className="grid size-11 place-items-center rounded-xl bg-secondary">
              <ChevronLeft className="size-5" />
            </button>
            <button onClick={next} aria-label="Další měsíc" className="grid size-11 place-items-center rounded-xl bg-secondary">
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
          <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-primary" />Potvrzeno</span>
          <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-primary/30" />Čeká na schválení</span>
        </div>

        {isFamily && (
          <Link to="/rezervace/nova" className="btn-primary mt-4 w-full">
            Rezervovat termín
          </Link>
        )}
      </section>

      <section className="mt-4">
        <h3 className="mb-2 text-lg font-bold">Nadcházející pobyty</h3>
        {isLoading ? (
          <Skeleton className="h-24" />
        ) : upcoming.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="Zatím žádné rezervace."
            hint={isFamily ? "Buďte první, kdo naplánuje pobyt." : "Schválené žádosti se zde zobrazí."}
            action={isFamily ? <Link to="/rezervace/nova" className="btn-primary w-full">Rezervovat termín</Link> : undefined}
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
                <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: branchColor(b.requester_name, branches) }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-bold">{b.requester_name}</p>
                  <p className="text-[13px] text-muted-foreground">
                    {fmtDate(b.start_date)} – {fmtDate(b.end_date)} · {b.guests} hostů
                  </p>
                </div>
                {b.status === "PENDING" && <span className="pill bg-warn-soft text-warn">Čeká</span>}
              </Link>
            ))}
          </div>
        )}
      </section>

      {isFamily && (
        <button onClick={copyPublicLink} className="card mt-4 flex w-full items-center gap-3 p-4 text-left active:scale-[0.99]">
          <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-secondary text-muted-foreground">
            <Link2 className="size-5" />
          </div>
          <div className="flex-1">
            <p className="text-[15px] font-bold">Veřejný odkaz na kalendář</p>
            <p className="text-[13px] text-muted-foreground">Pro členy bez aplikace — pouze ke čtení</p>
          </div>
        </button>
      )}
    </AppShell>
  );
}

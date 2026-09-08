import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarDays, Inbox } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { LoadingCards, PillDanger, PillOk, PillWarn, StatCard } from "@/components/bits";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/account";
import { fmtDate, fmtKc, todayISO, type Booking, type Expense, type ExpenseSplit, type InstitutionalRequest, type Task } from "@/lib/data";
import chataImg from "@/assets/chata.jpg";

export const Route = createFileRoute("/domu")({
  head: () => ({
    meta: [
      { title: "Domů — My Chata" },
      { name: "description", content: "Přehled chaty: nejbližší pobyt, úkoly, výdaje a žádosti." },
      { property: "og:title", content: "Domů — My Chata" },
      { property: "og:description", content: "Přehled chaty: nejbližší pobyt, úkoly, výdaje a žádosti." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { account, property, currentMember, loading } = useAccount();

  const { data: bookings, isLoading: lb } = useQuery({
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

  const { data: tasks, isLoading: lt } = useQuery({
    queryKey: ["tasks", property?.id],
    enabled: !!property,
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("*").eq("property_id", property!.id);
      if (error) throw error;
      return data as Task[];
    },
  });

  const isFamily = account?.type === "FAMILY";

  const { data: expenses } = useQuery({
    queryKey: ["expenses", property?.id],
    enabled: !!property && isFamily,
    queryFn: async () => {
      const { data, error } = await supabase.from("expenses").select("*").eq("property_id", property!.id);
      if (error) throw error;
      return data as Expense[];
    },
  });

  const { data: splits } = useQuery({
    queryKey: ["splits", property?.id],
    enabled: !!property && isFamily && !!expenses,
    queryFn: async () => {
      const ids = expenses!.map((e) => e.id);
      if (!ids.length) return [] as ExpenseSplit[];
      const { data, error } = await supabase.from("expense_splits").select("*").in("expense_id", ids);
      if (error) throw error;
      return data as ExpenseSplit[];
    },
  });

  const { data: requests } = useQuery({
    queryKey: ["requests", property?.id],
    enabled: !!property && !isFamily,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("institutional_requests")
        .select("*")
        .eq("property_id", property!.id)
        .order("start_date");
      if (error) throw error;
      return data as InstitutionalRequest[];
    },
  });

  if (loading || lb || lt) {
    return (
      <AppShell>
        <LoadingCards />
      </AppShell>
    );
  }

  const today = todayISO();
  const upcoming = bookings?.filter((b) => b.end_date >= today && b.status === "CONFIRMED") ?? [];
  const nextBooking = upcoming[0];
  const pendingBookings = bookings?.filter((b) => b.status === "PENDING") ?? [];
  const overdueTasks = tasks?.filter((t) => t.status !== "DONE" && t.due_date && t.due_date < today) ?? [];
  const openTasks = tasks?.filter((t) => t.status !== "DONE") ?? [];
  const unsettled = splits?.filter((s) => !s.paid_back).reduce((sum, s) => sum + Number(s.amount_owed), 0) ?? 0;
  const pendingRequests = requests?.filter((r) => r.status === "PENDING") ?? [];
  const conflictRequests = pendingRequests.filter((r) => r.has_conflict);

  return (
    <AppShell>
      {/* Property hero */}
      <section>
        <div className="relative overflow-hidden rounded-3xl">
          <img src={chataImg} alt={property?.name ?? "Chata"} className="aspect-[16/10] w-full object-cover" width={1024} height={640} />
          <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-card/95 px-3 py-1.5 ring-1 ring-black/5">
            <span className="size-2 rounded-full bg-ok" />
            <span className="text-[13px] font-bold">{nextBooking ? "Připravená" : "Volná"}</span>
          </div>
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-2xl bg-card/95 px-4 py-3 ring-1 ring-black/5">
            <div>
              <p className="text-[12px] font-semibold text-muted-foreground">Nejbližší pobyt</p>
              {nextBooking ? (
                <p className="text-base font-bold leading-tight">
                  {fmtDate(nextBooking.start_date)} – {fmtDate(nextBooking.end_date)}
                </p>
              ) : (
                <p className="text-base font-bold leading-tight">Zatím žádný</p>
              )}
            </div>
            <Link to="/kalendar" className="grid size-11 place-items-center rounded-2xl bg-secondary text-foreground" aria-label="Otevřít kalendář">
              <CalendarDays className="size-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Greeting */}
      <p className="mt-4 text-[15px] font-semibold text-muted-foreground">
        Dobrý den, {currentMember?.name?.split(" ")[0] ?? ""}
      </p>

      {/* Stats */}
      <section className="mt-3 grid grid-cols-2 gap-3">
        {isFamily ? (
          <>
            <Link to="/schvalovani">
              <StatCard label="Ke schválení" value={pendingBookings.length} hint={pendingBookings.length ? "rezervace čekají" : "nic nečeká"} />
            </Link>
            <Link to="/vydaje/vyrovnani">
              <StatCard label="Nevyrovnané" value={fmtKc(unsettled)} hint="ve výdajích" tone={unsettled > 0 ? "danger" : undefined} />
            </Link>
          </>
        ) : (
          <>
            <Link to="/zadosti">
              <StatCard label="Čekající žádosti" value={pendingRequests.length} hint="ke zpracování" tone={pendingRequests.length ? "danger" : undefined} />
            </Link>
            <Link to="/zadosti">
              <StatCard label="Kolize" value={conflictRequests.length} hint="vyžadují pozornost" tone={conflictRequests.length ? "danger" : undefined} />
            </Link>
          </>
        )}
        <Link to="/ukoly">
          <StatCard label="Po termínu" value={overdueTasks.length} hint={overdueTasks.length ? "úkoly po termínu" : "vše v pořádku"} tone={overdueTasks.length ? "danger" : undefined} />
        </Link>
        <Link to="/kalendar">
          <StatCard label="Nadcházející" value={upcoming.length} hint="potvrzené pobyty" />
        </Link>
      </section>

      {/* Institutional: quick link to queue */}
      {!isFamily && pendingRequests.length > 0 && (
        <Link to="/zadosti" className="card mt-4 flex items-center gap-3 p-4 active:scale-[0.99]">
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
            <Inbox className="size-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold leading-tight">Zpracovat žádosti</p>
            <p className="text-[13px] text-muted-foreground">
              {pendingRequests.length} čeká · {conflictRequests.length} v kolizi
            </p>
          </div>
          <ArrowRight className="size-5 text-muted-foreground" />
        </Link>
      )}

      {/* Overdue task highlight */}
      {overdueTasks.length > 0 && (
        <section className="card mt-4 p-4">
          <h3 className="text-lg font-bold">Úkoly po termínu</h3>
          <div className="mt-2 space-y-2.5">
            {overdueTasks.map((t) => (
              <Link key={t.id} to="/ukoly/$id" params={{ id: t.id }} className="flex items-center gap-3 rounded-2xl bg-background p-3 active:scale-[0.99]">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-bold">{t.title}</p>
                  <p className="text-[13px] text-muted-foreground">Termín: {fmtDate(t.due_date)}</p>
                </div>
                <PillDanger>Zpožděno</PillDanger>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Next booking card */}
      {nextBooking && (
        <section className="card mt-4 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">Nejbližší pobyt</h3>
            <PillOk>Potvrzeno</PillOk>
          </div>
          <p className="mt-1 text-xl font-bold">
            {fmtDate(nextBooking.start_date)} – {fmtDate(nextBooking.end_date)}
          </p>
          <p className="mt-1 text-[15px] text-muted-foreground">
            {nextBooking.requester_name} · {nextBooking.guests} {nextBooking.guests === 1 ? "host" : nextBooking.guests < 5 ? "hosté" : "hostů"}
          </p>
          <div className="mt-3 flex gap-2">
            <Link to="/rezervace/$id" params={{ id: nextBooking.id }} className="btn-primary flex-1">
              Detail pobytu
            </Link>
            <Link to="/predani" className="btn-secondary flex-1">
              Předání chaty
            </Link>
          </div>
        </section>
      )}

      {openTasks.length === 0 && overdueTasks.length === 0 && (
        <div className="card mt-4 p-4 text-center">
          <PillWarn>Tip</PillWarn>
          <p className="mt-2 text-[15px] font-semibold">Všechny úkoly jsou hotové. Chatu máte pod kontrolou.</p>
        </div>
      )}
    </AppShell>
  );
}

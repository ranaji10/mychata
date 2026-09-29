import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, CalendarDays, Inbox, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { LoadingCards, PillDanger, PillOk, PillWarn, StatCard } from "@/components/bits";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/account";
import {
  checklistProgress,
  fmtDate,
  fmtDateTime,
  fmtKc,
  taskTitle,
  todayISO,
  type Booking,
  type Handover,
  type InstitutionalRequest,
  type Task,
} from "@/lib/data";
import { useLang } from "@/lib/i18n";
import chataImg from "@/assets/chata.jpg";
import { usePrimaryPhotoUrl } from "@/lib/use-primary-photo";
import { useExpenseData } from "@/lib/expenses";

export const Route = createFileRoute("/domu")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Home — My Chata" },
      {
        name: "description",
        content: "Cottage overview: upcoming stay, tasks, expenses and requests.",
      },
      { property: "og:title", content: "Home — My Chata" },
      {
        property: "og:description",
        content: "Cottage overview: upcoming stay, tasks, expenses and requests.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { t, lang } = useLang();
  const { account, property, currentMember, loading } = useAccount();
  const navigate = useNavigate();

  // The last leaving checklist, so whoever comes next sees what was done (T-019). Emailing it
  // to the next booker comes with notifications (CC-3).
  const { data: lastDeparture } = useQuery({
    queryKey: ["handovers", property?.id, "latest"],
    enabled: !!property,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("handovers")
        .select("*")
        .eq("property_id", property!.id)
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as Handover | null) ?? null;
    },
  });

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
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("property_id", property!.id);
      if (error) throw error;
      return data as Task[];
    },
  });

  const isFamily = account?.type === "FAMILY";

  const { data: expenseData } = useExpenseData(property?.id, isFamily);
  const splits = expenseData?.splits;

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

  const isAdmin = currentMember?.role === "ADMIN" || currentMember?.role === "OWNER";
  const { data: guestRequests } = useQuery({
    queryKey: ["guest-requests", property?.id],
    enabled: !!property && isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guest_requests")
        .select("*")
        .eq("property_id", property!.id)
        .eq("status", "PENDING")
        .order("start_date");
      if (error) throw error;
      return data;
    },
  });

  // One admin-only database step writes the booking and the decision together (T-021).
  // The card shows progress and disappears as soon as the database confirms.
  const queryClient = useQueryClient();
  const decideGuest = useMutation({
    mutationFn: async ({ id, approve }: { id: string; approve: boolean }) => {
      const { error } = await supabase.rpc("decide_guest_request", {
        _request_id: id,
        _approve: approve,
      });
      if (error) throw error;
    },
    onSuccess: async (_d, { approve }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["guest-requests", property?.id] }),
        queryClient.invalidateQueries({ queryKey: ["bookings", property?.id] }),
      ]);
      toast.success(
        approve
          ? t("Pobyt potvrzen a zapsán do kalendáře.", "Stay confirmed and added to the calendar.")
          : t("Žádost odmítnuta.", "Request declined."),
      );
    },
    onError: (error) => {
      console.error("[domu] decide guest request", error);
      const m = error.message;
      toast.error(
        m.includes("Admin role required")
          ? t("Žádosti hostů vyřizuje jen správce.", "Only an admin can decide guest requests.")
          : m.includes("already_decided")
            ? t("O této žádosti už bylo rozhodnuto.", "This request has already been decided.")
            : t(`Akce se nepodařila: ${m}`, `That didn't work: ${m}`),
      );
      void queryClient.invalidateQueries({ queryKey: ["guest-requests", property?.id] });
    },
  });

  const { data: mainPhoto } = usePrimaryPhotoUrl(property?.id);

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
  const overdueTasks =
    tasks?.filter((t) => t.status !== "DONE" && t.due_date && t.due_date < today) ?? [];
  const openTasks = tasks?.filter((t) => t.status !== "DONE") ?? [];
  const unsettled =
    splits?.filter((s) => !s.paid_back).reduce((sum, s) => sum + Number(s.amount_owed), 0) ?? 0;
  const pendingRequests = requests?.filter((r) => r.status === "PENDING") ?? [];
  const conflictRequests = pendingRequests.filter((r) => r.has_conflict);

  const guestsLabel = (n: number) => {
    if (lang === "en") return n === 1 ? "guest" : "guests";
    return n === 1 ? "host" : n < 5 ? "hosté" : "hostů";
  };

  return (
    <AppShell>
      {/* Property hero */}
      <section>
        <div className="relative overflow-hidden rounded-3xl">
          <img
            src={mainPhoto ?? chataImg}
            alt={property?.name ?? t("Chata", "Cottage")}
            className="aspect-[16/10] w-full object-cover"
            width={1024}
            height={640}
          />
          <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-card/95 px-3 py-1.5 ring-1 ring-black/5">
            <span className="size-2 rounded-full bg-ok" />
            <span className="text-[13px] font-bold">
              {nextBooking ? t("Připravená", "Ready") : t("Volná", "Free")}
            </span>
          </div>
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-2xl bg-card/95 px-4 py-3 ring-1 ring-black/5">
            <div>
              <p className="text-[12px] font-semibold text-muted-foreground">
                {t("Nejbližší pobyt", "Next stay")}
              </p>
              {nextBooking ? (
                <p className="text-base font-bold leading-tight">
                  {fmtDate(nextBooking.start_date)} – {fmtDate(nextBooking.end_date)}
                </p>
              ) : (
                <p className="text-base font-bold leading-tight">{t("Zatím žádný", "None yet")}</p>
              )}
            </div>
            <Link
              to="/kalendar"
              className="grid size-11 place-items-center rounded-2xl bg-secondary text-foreground"
              aria-label={t("Otevřít kalendář", "Open calendar")}
            >
              <CalendarDays className="size-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Greeting */}
      <p className="mt-4 text-[15px] font-semibold text-muted-foreground">
        {t("Dobrý den", "Hello")}, {currentMember?.name?.split(" ")[0] ?? ""}
      </p>

      {/* Add a booking: always one tap away (the calendar opens with date picking). */}
      <Link to="/kalendar" search={{ book: true }} className="btn-primary mt-3 w-full">
        <CalendarDays className="size-5" /> {t("Přidat pobyt", "Add booking")}
      </Link>

      {/* Family: next stay is the first actionable card — the whole card opens the stay */}
      {isFamily && (
        <section
          className={`card mt-3 p-4 ${nextBooking ? "cursor-pointer active:scale-[0.99]" : ""}`}
          onClick={() =>
            nextBooking &&
            navigate({ to: "/rezervace/$id", params: { id: nextBooking.id } })
          }
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">{t("Nejbližší pobyt", "Next stay")}</h3>
            {nextBooking && <PillOk>{t("Potvrzeno", "Confirmed")}</PillOk>}
          </div>
          {nextBooking ? (
            <>
              <p className="mt-1 text-xl font-bold">
                {fmtDate(nextBooking.start_date)} – {fmtDate(nextBooking.end_date)}
              </p>
              <p className="mt-1 text-[15px] text-muted-foreground">
                {nextBooking.requester_name} · {nextBooking.guests}{" "}
                {guestsLabel(nextBooking.guests)}
              </p>
              <div className="mt-3 flex gap-2">
                <Link
                  to="/rezervace/$id"
                  params={{ id: nextBooking.id }}
                  onClick={(e) => e.stopPropagation()}
                  className="btn-primary flex-1"
                >
                  {t("Detail pobytu", "Stay details")}
                </Link>
                <Link
                  to="/predani"
                  onClick={(e) => e.stopPropagation()}
                  className="btn-secondary flex-1"
                >
                  {t("Odjezd", "Check Out")}
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="mt-1 text-[15px] text-muted-foreground">
                {t("Zatím není naplánovaný žádný pobyt.", "No stay is planned yet.")}
              </p>
            </>
          )}
        </section>
      )}

      {/* Stats */}
      <section className="mt-3 grid grid-cols-2 gap-3">
        {isFamily ? (
          <>
            <Link to="/vydaje/vyrovnani">
              <StatCard
                label={t("Nevyrovnané", "Unsettled")}
                value={fmtKc(unsettled)}
                hint={t("ve výdajích", "in expenses")}
                tone={unsettled > 0 ? "danger" : undefined}
              />
            </Link>
          </>
        ) : (
          <>
            <Link to="/zadosti">
              <StatCard
                label={t("Čekající žádosti", "Pending requests")}
                value={pendingRequests.length}
                hint={t("ke zpracování", "to process")}
                tone={pendingRequests.length ? "danger" : undefined}
              />
            </Link>
            <Link to="/zadosti">
              <StatCard
                label={t("Kolize", "Conflicts")}
                value={conflictRequests.length}
                hint={t("vyžadují pozornost", "need attention")}
                tone={conflictRequests.length ? "danger" : undefined}
              />
            </Link>
          </>
        )}
        {!isFamily && (
          <Link to="/ukoly">
            <StatCard
              label={t("Po termínu", "Overdue")}
              value={overdueTasks.length}
              hint={
                overdueTasks.length
                  ? t("úkoly po termínu", "overdue tasks")
                  : t("vše v pořádku", "all good")
              }
              tone={overdueTasks.length ? "danger" : undefined}
            />
          </Link>
        )}
        <Link to="/kalendar">
          <StatCard
            label={t("Nadcházející", "Upcoming")}
            value={upcoming.length}
            hint={t("potvrzené pobyty", "confirmed stays")}
          />
        </Link>
      </section>

      {/* Institutional: quick link to queue */}
      {!isFamily && pendingRequests.length > 0 && (
        <Link to="/zadosti" className="card mt-4 flex items-center gap-3 p-4 active:scale-[0.99]">
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
            <Inbox className="size-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold leading-tight">
              {t("Zpracovat žádosti", "Process requests")}
            </p>
            <p className="text-[13px] text-muted-foreground">
              {pendingRequests.length} {t("čeká", "waiting")} · {conflictRequests.length}{" "}
              {t("v kolizi", "in conflict")}
            </p>
          </div>
          <ArrowRight className="size-5 text-muted-foreground" />
        </Link>
      )}

      {/* Guest booking requests (no-account guests) */}
      {isAdmin && !!guestRequests?.length && (
        <section className="card mt-4 p-4">
          <h3 className="text-lg font-bold">{t("Žádosti hostů", "Guest requests")}</h3>
          <div className="mt-2 space-y-2.5">
            {guestRequests.map((g) => (
              <div key={g.id} className="rounded-2xl bg-background p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-[15px] font-bold">{g.guest_name}</p>
                  <PillWarn>{t("Čeká", "Pending")}</PillWarn>
                </div>
                <p className="text-[13px] text-muted-foreground">
                  {fmtDate(g.start_date)} – {fmtDate(g.end_date)} · {g.guests}{" "}
                  {guestsLabel(g.guests)} · {g.guest_email}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(() => {
                    const busy = decideGuest.isPending && decideGuest.variables?.id === g.id;
                    const busyApprove = busy && decideGuest.variables?.approve;
                    return (
                      <>
                        <button
                          className="btn-secondary disabled:opacity-50"
                          disabled={decideGuest.isPending}
                          onClick={() => decideGuest.mutate({ id: g.id, approve: false })}
                        >
                          {busy && !busyApprove ? (
                            <>
                              <Loader2 className="size-5 animate-spin" />
                              {t("Odmítám…", "Declining…")}
                            </>
                          ) : (
                            t("Odmítnout", "Decline")
                          )}
                        </button>
                        <button
                          className="btn-primary disabled:opacity-50"
                          disabled={decideGuest.isPending}
                          aria-busy={busyApprove}
                          onClick={() => decideGuest.mutate({ id: g.id, approve: true })}
                        >
                          {busyApprove ? (
                            <>
                              <Loader2 className="size-5 animate-spin" />
                              {t("Potvrzuji…", "Confirming…")}
                            </>
                          ) : (
                            t("Potvrdit pobyt", "Confirm stay")
                          )}
                        </button>
                      </>
                    );
                  })()}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Overdue task highlight */}
      {overdueTasks.length > 0 && (
        <section className="card mt-4 p-4">
          <h3 className="text-lg font-bold">{t("Úkoly po termínu", "Overdue tasks")}</h3>
          <div className="mt-2 space-y-2.5">
            {overdueTasks.map((t2) => (
              <Link
                key={t2.id}
                to="/ukoly/$id"
                params={{ id: t2.id }}
                className="flex items-center gap-3 rounded-2xl bg-background p-3 active:scale-[0.99]"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-bold">{taskTitle(t2, lang)}</p>
                  <p className="text-[13px] text-muted-foreground">
                    {t("Termín", "Due")}: {fmtDate(t2.due_date)}
                  </p>
                </div>
                <PillDanger>{t("Zpožděno", "Overdue")}</PillDanger>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Next booking card (institutional) — the whole card opens the stay */}
      {!isFamily && nextBooking && (
        <section
          className="card mt-4 cursor-pointer p-4 active:scale-[0.99]"
          onClick={() => navigate({ to: "/rezervace/$id", params: { id: nextBooking.id } })}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">{t("Nejbližší pobyt", "Next stay")}</h3>
            <PillOk>{t("Potvrzeno", "Confirmed")}</PillOk>
          </div>
          <p className="mt-1 text-xl font-bold">
            {fmtDate(nextBooking.start_date)} – {fmtDate(nextBooking.end_date)}
          </p>
          <p className="mt-1 text-[15px] text-muted-foreground">
            {nextBooking.requester_name} · {nextBooking.guests} {guestsLabel(nextBooking.guests)}
          </p>
          <div className="mt-3 flex gap-2">
            <Link
              to="/rezervace/$id"
              params={{ id: nextBooking.id }}
              onClick={(e) => e.stopPropagation()}
              className="btn-primary flex-1"
            >
              {t("Detail pobytu", "Stay details")}
            </Link>
            <Link
              to="/predani"
              onClick={(e) => e.stopPropagation()}
              className="btn-secondary flex-1"
            >
              {t("Odjezdový checklist", "Check-out checklist")}
            </Link>
          </div>
        </section>
      )}

      {lastDeparture &&
        (() => {
          const { done, total } = checklistProgress(lastDeparture.checklist_state);
          return (
            <Link to="/predani" className="card mt-4 block p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-bold">{t("Poslední odjezd", "Last departure")}</h3>
                {done === total ? (
                  <PillOk>{t(`${done} z ${total} hotovo`, `${done} of ${total} done`)}</PillOk>
                ) : (
                  <PillWarn>{t(`${done} z ${total} hotovo`, `${done} of ${total} done`)}</PillWarn>
                )}
              </div>
              <p className="mt-1 text-[15px] text-muted-foreground">
                {fmtDateTime(lastDeparture.submitted_at)}
                {lastDeparture.note ? ` · „${lastDeparture.note}“` : ""}
              </p>
            </Link>
          );
        })()}

      {openTasks.length === 0 && overdueTasks.length === 0 && (
        <div className="card mt-4 p-4 text-center">
          <PillWarn>{t("Tip", "Tip")}</PillWarn>
          <p className="mt-2 text-[15px] font-semibold">
            {t(
              "Všechny úkoly jsou hotové. Chatu máte pod kontrolou.",
              "All tasks are done. You have the cottage under control.",
            )}
          </p>
        </div>
      )}
    </AppShell>
  );
}

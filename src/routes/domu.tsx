import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";
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
import { usePendingGuestRequests } from "@/lib/guest-requests";
import { useLang } from "@/lib/i18n";
import { useDefaultChataPhoto } from "@/lib/season";
import { usePrimaryPhotoUrl } from "@/lib/use-primary-photo";
import { useExpenseData } from "@/lib/expenses";

export const Route = createFileRoute("/domu")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Domů — My Chata" },
      {
        name: "description",
        content: "Cottage overview: upcoming stay, tasks, expenses and requests.",
      },
      { property: "og:title", content: "Domů — My Chata" },
      {
        property: "og:description",
        content: "Cottage overview: upcoming stay, tasks, expenses and requests.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const defaultPhoto = useDefaultChataPhoto();
  const { t, lang } = useLang();
  const { account, property, currentMember, loading, profile } = useAccount();
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

  const {
    data: bookings,
    isLoading: lb,
    isError: eb,
    refetch: refetchBookings,
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

  const {
    data: tasks,
    isLoading: lt,
    isError: et,
    refetch: refetchTasks,
  } = useQuery({
    queryKey: ["tasks", property?.id],
    enabled: !!property,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("property_id", property!.id)
        // Same order as the Tasks page: both pages share this cache entry (T-026).
        .order("due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data as Task[];
    },
  });

  const isFamily = account?.type === "FAMILY";

  const { data: expenseData } = useExpenseData(property?.id, isFamily);
  const splits = expenseData?.splits;

  const { data: requests } = useQuery({
    queryKey: ["requests", property?.id],
    // New requests come from the public form: never treat a restored offline copy as fresh.
    staleTime: 0,
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
  const { data: guestRequests } = usePendingGuestRequests(property?.id, isAdmin);

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
      track("booking_decided", {
        result: approve ? "approved" : "declined",
        source: "guest_request",
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["guest-requests", property?.id] }),
        queryClient.invalidateQueries({ queryKey: ["guest-requests-decided", property?.id] }),
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
            : m.includes("dates_taken")
              ? t(
                  "Tyto dny už jsou mezitím obsazené. Žádost můžete zamítnout.",
                  "These days have been booked in the meantime. You can decline the request.",
                )
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
  // Checkout tasks belong to a stay that has started, not to one weeks away (F-17).
  const stayStarted = !!nextBooking && nextBooking.start_date <= today;
  const heldBookings = bookings?.filter((b) => b.status === "PENDING" && b.end_date >= today) ?? [];
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

  // A failed read used to look like "no stays, no tasks" (invariant 6, T-026).
  const loadFailed = (eb && !bookings) || (et && !tasks);

  return (
    <AppShell>
      {loadFailed && (
        <div role="alert" className="card mb-3 p-4">
          <p className="font-bold">
            {t(
              "Některé údaje se nepodařilo načíst, přehled nemusí být úplný.",
              "Some information could not be loaded; this overview may be incomplete.",
            )}
          </p>
          <Button
            variant="fresh"
            size="fresh"
            onClick={() => {
              void refetchBookings();
              void refetchTasks();
            }}
            className="btn-secondary mt-3 w-full"
          >
            {t("Zkusit znovu", "Try again")}
          </Button>
        </div>
      )}
      {/* No saved name: others would see an email (bug 7 of 18 Oct). */}
      {!(profile?.display_name ?? "").trim() && (
        <Link
          to="/profil"
          className="mb-3 flex min-h-11 items-center justify-between gap-2 rounded-2xl bg-warn-soft p-3 text-[16px] font-semibold text-warn-foreground"
        >
          {t(
            "Doplňte své jméno, ať ostatní vědí, kdo jste.",
            "Add your name so others know who you are.",
          )}
          <ArrowRight className="size-5 shrink-0" />
        </Link>
      )}
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h2 className="text-[32px] font-extrabold leading-[1.12] lg:text-[40px]">
          {nextBooking && nextBooking.start_date > today
            ? t(
                `Chata je volná do ${fmtDate(nextBooking.start_date)}.`,
                `The chata is available until ${fmtDate(nextBooking.start_date)}.`,
              )
            : t(
                `Dobrý den, ${currentMember?.name?.split(" ")[0] ?? ""}`,
                `Hello, ${currentMember?.name?.split(" ")[0] ?? ""}`,
              )}
        </h2>
        <Link to="/kalendar" search={{ book: true }} className="btn-primary shrink-0">
          <CalendarDays className="size-5" />
          {t("Přidat pobyt", "Add booking")}
        </Link>
      </div>
      {/* Property hero */}
      <section>
        <div className="relative overflow-hidden rounded-[28px]">
          <img
            src={mainPhoto ?? defaultPhoto.src}
            srcSet={mainPhoto ? undefined : defaultPhoto.srcSet}
            sizes={mainPhoto ? undefined : defaultPhoto.sizes}
            alt={mainPhoto ? (property?.name ?? t("Chata", "Cottage")) : defaultPhoto.alt}
            className="aspect-[16/10] w-full object-cover object-[50%_42%] md:aspect-[21/9]"
            loading="lazy"
            width={1200}
            height={640}
          />
          <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-card/95 px-3 py-1.5 shadow-chip">
            <span className="size-2 rounded-full bg-ok" />
            <span className="text-[16px] font-bold">
              {/* "Free" read like a price (bug 2 of 18 Oct). */}
              {nextBooking ? t("Připravená", "Ready") : t("Volná", "Available")}
            </span>
          </div>
          {/* The next stay has its own card below, so the photo links to the calendar
              instead of repeating "Next stay" (F-17). */}
          <Link
            to="/kalendar"
            className="absolute bottom-3 left-3 right-3 flex min-h-11 items-center justify-between rounded-2xl bg-card/95 px-4 py-3 shadow-chip"
          >
            <div>
              <p className="text-base font-bold leading-tight">{t("Kalendář", "Calendar")}</p>
              <p className="text-[16px] font-semibold text-muted-foreground">
                {t("Všechny pobyty a volné dny", "All stays and available days")}
              </p>
            </div>
            <span className="grid size-11 place-items-center rounded-2xl bg-secondary text-foreground">
              <CalendarDays className="size-5" />
            </span>
          </Link>
        </div>
      </section>

      {/* Family: next stay is the first actionable card — the whole card opens the stay */}
      {isFamily && (
        <section
          className={`card mt-3 p-4 ${nextBooking ? "cursor-pointer active:scale-[0.99]" : ""}`}
          onClick={() =>
            nextBooking && navigate({ to: "/rezervace/$id", params: { id: nextBooking.id } })
          }
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">
              {stayStarted
                ? t("Probíhající pobyt", "Current stay")
                : t("Nejbližší pobyt", "Next stay")}
            </h3>
            {nextBooking && <PillOk>{t("Potvrzeno", "Confirmed")}</PillOk>}
          </div>
          {nextBooking ? (
            <>
              <p className="mt-1 text-xl font-bold">
                {fmtDate(nextBooking.start_date)} – {fmtDate(nextBooking.end_date)}
              </p>
              <p className="mt-1 text-[16px] text-muted-foreground">
                {nextBooking.requester_name} · {nextBooking.guests}{" "}
                {guestsLabel(nextBooking.guests)}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  to="/rezervace/$id"
                  params={{ id: nextBooking.id }}
                  onClick={(e) => e.stopPropagation()}
                  className="btn-primary flex-1"
                >
                  {t("Detail pobytu", "Stay details")}
                </Link>
                {stayStarted && (
                  <Link
                    to="/predani"
                    onClick={(e) => e.stopPropagation()}
                    className="btn-secondary flex-1"
                  >
                    {t("Odjezdové úkoly", "Checkout Tasks")}
                  </Link>
                )}
              </div>
            </>
          ) : (
            <>
              <p className="mt-1 text-[16px] text-muted-foreground">
                {t("Zatím není naplánovaný žádný pobyt.", "No stay is planned yet.")}
              </p>
            </>
          )}
        </section>
      )}

      {/* Stats */}
      <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-[repeat(auto-fit,minmax(200px,1fr))] lg:gap-4">
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
            <p className="text-[16px] text-muted-foreground">
              {pendingRequests.length} {t("čeká", "waiting")} · {conflictRequests.length}{" "}
              {t("v kolizi", "in conflict")}
            </p>
          </div>
          <ArrowRight className="size-5 text-muted-foreground" />
        </Link>
      )}

      {/* Family: members' stays held for the admin by the overlap rule (T-036, T-038) */}
      {isFamily && isAdmin && heldBookings.length > 0 && (
        <section className="card mt-4 p-4">
          <h3 className="text-lg font-bold">
            {t("Pobyty ke schválení", "Stays awaiting approval")}
          </h3>
          <div className="mt-2 space-y-2">
            {heldBookings.map((b) => (
              <Link
                key={b.id}
                to="/rezervace/$id"
                params={{ id: b.id }}
                className="flex min-h-14 items-center gap-3 rounded-2xl bg-secondary p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[16px] font-bold">{b.requester_name}</p>
                  <p className="text-[16px] text-muted-foreground">
                    {fmtDate(b.start_date)} – {fmtDate(b.end_date)}
                  </p>
                </div>
                <PillWarn>{t("Rozhodnout", "Decide")}</PillWarn>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Guest booking requests (no-account guests) */}
      {isAdmin && !!guestRequests?.length && (
        <section className="card mt-4 p-4">
          <h3 className="text-lg font-bold">{t("Žádosti o pobyt", "Booking requests")}</h3>
          <div className="mt-2 space-y-2.5">
            {guestRequests.map((g) => (
              <div key={g.id} className="border-b border-divider py-3 last:border-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-[16px] font-bold">{g.guest_name}</p>
                  <PillWarn>{t("Čeká", "Pending")}</PillWarn>
                </div>
                <p className="text-[16px] text-muted-foreground">
                  {fmtDate(g.start_date)} – {fmtDate(g.end_date)} · {g.guests}{" "}
                  {guestsLabel(g.guests)} · {g.guest_email}
                </p>
                {/* When and where it came from (T-043): the public calendar needs an account. */}
                <p className="text-[14px] text-muted-foreground">
                  {(g as { source?: string }).source === "public_calendar"
                    ? t("Z veřejného kalendáře", "From the public calendar")
                    : t("Z odkazu pro hosty", "From the guest link")}{" "}
                  · {t("požádáno", "requested")} {fmtDateTime(g.created_at)}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(() => {
                    const busy = decideGuest.isPending && decideGuest.variables?.id === g.id;
                    const busyApprove = busy && decideGuest.variables?.approve;
                    return (
                      <>
                        <Button
                          variant="fresh"
                          size="fresh"
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
                        </Button>
                        <Button
                          variant="fresh"
                          size="fresh"
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
                        </Button>
                      </>
                    );
                  })()}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="lg:grid lg:grid-cols-2 lg:gap-5">
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
                  className="flex min-h-[60px] items-center gap-3 border-b border-divider py-3 last:border-0 active:scale-[0.99]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[16px] font-bold">{taskTitle(t2, lang)}</p>
                    <p className="text-[16px] text-muted-foreground">
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
              <h3 className="text-lg font-bold">
                {stayStarted
                  ? t("Probíhající pobyt", "Current stay")
                  : t("Nejbližší pobyt", "Next stay")}
              </h3>
              <PillOk>{t("Potvrzeno", "Confirmed")}</PillOk>
            </div>
            <p className="mt-1 text-xl font-bold">
              {fmtDate(nextBooking.start_date)} – {fmtDate(nextBooking.end_date)}
            </p>
            <p className="mt-1 text-[16px] text-muted-foreground">
              {nextBooking.requester_name} · {nextBooking.guests} {guestsLabel(nextBooking.guests)}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                to="/rezervace/$id"
                params={{ id: nextBooking.id }}
                onClick={(e) => e.stopPropagation()}
                className="btn-primary flex-1"
              >
                {t("Detail pobytu", "Stay details")}
              </Link>
              {stayStarted && (
                <Link
                  to="/predani"
                  onClick={(e) => e.stopPropagation()}
                  className="btn-secondary flex-1"
                >
                  {t("Odjezdové úkoly", "Checkout Tasks")}
                </Link>
              )}
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
                    <PillWarn>
                      {t(`${done} z ${total} hotovo`, `${done} of ${total} done`)}
                    </PillWarn>
                  )}
                </div>
                <p className="mt-1 text-[16px] text-muted-foreground">
                  {fmtDateTime(lastDeparture.submitted_at)}
                  {lastDeparture.note ? ` · „${lastDeparture.note}“` : ""}
                </p>
              </Link>
            );
          })()}
      </div>
      {openTasks.length === 0 && overdueTasks.length === 0 && (
        <div className="card mt-4 p-4 text-center">
          <PillWarn>{t("Tip", "Tip")}</PillWarn>
          <p className="mt-2 text-[16px] font-semibold">
            {(tasks?.length ?? 0) > 0
              ? t(
                  "Všechny úkoly jsou hotové. Chatu máte pod kontrolou.",
                  "All tasks are done. You have the cottage under control.",
                )
              : t(
                  "Zatím tu nejsou žádné úkoly. Přidejte první nebo sezónní seznam v Nastavení → Spravovat chaty → Údržba.",
                  "No tasks yet. Add the first one, or a seasonal checklist, in Settings → Manage cottages → Maintenance.",
                )}
          </p>
        </div>
      )}
    </AppShell>
  );
}

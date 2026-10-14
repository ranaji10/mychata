import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PillNeutral, PillOk, PillWarn, Skeleton } from "@/components/bits";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/account";
import { fmtDate, fmtDateTime, todayISO, type Booking } from "@/lib/data";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/rezervace/$id")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Stay detail — My Chata" },
      { name: "description", content: "Details of a cottage stay booking." },
      { property: "og:title", content: "Stay detail — My Chata" },
      { property: "og:description", content: "Details of a cottage stay booking." },
    ],
  }),
  component: BookingDetail,
});

function BookingDetail() {
  const { id } = Route.useParams();
  const { account, currentMember, members } = useAccount();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t, lang } = useLang();

  const bookingKey = ["booking", account?.id, id];
  const [confirmRemove, setConfirmRemove] = useState(false);
  const {
    data: booking,
    isLoading,
    isError,
  } = useQuery({
    queryKey: bookingKey,
    enabled: !!account,
    queryFn: async () => {
      const { data, error } = await supabase.from("bookings").select("*").eq("id", id).single();
      if (error) throw error;
      return data as Booking;
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: bookingKey });
    queryClient.invalidateQueries({ queryKey: ["bookings"] });
  };

  const confirm = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .update({ status: "CONFIRMED" })
        .eq("id", id)
        .select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("nothing_changed");
    },
    onSuccess: () => {
      invalidate();
      toast.success(t("Pobyt schválen.", "Stay approved."));
      navigate({ to: "/kalendar" });
    },
    onError: (e: Error) => toast.error(failure(e)),
  });

  const remove = useMutation({
    mutationFn: async () => {
      // Row-level security turns a refused delete into "0 rows", not an error (T-026: it said
      // "removed" while the stay stayed in the calendar).
      const { data, error } = await supabase.from("bookings").delete().eq("id", id).select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("nothing_changed");
    },
    onSuccess: () => {
      setConfirmRemove(false);
      invalidate();
      toast.success(t("Rezervace byla odstraněna.", "The booking has been removed."));
      navigate({ to: "/kalendar" });
    },
    onError: (e: Error) => {
      setConfirmRemove(false);
      toast.error(failure(e));
    },
  });

  function failure(e: Error) {
    return e.message === "nothing_changed"
      ? t(
          "Nic se nezměnilo: měnit nebo rušit pobyt může jen ten, kdo ho zapsal, nebo správce.",
          "Nothing changed: only the person who booked the stay or an admin can change or cancel it.",
        )
      : t("Akce se nepodařila.", "The action failed.");
  }

  if (isLoading) {
    return (
      <AppShell>
        <Skeleton className="h-40" />
        <Skeleton className="h-24" />
      </AppShell>
    );
  }

  if (isError || !booking) {
    return (
      <AppShell>
        <p className="text-[16px]">{t("Tento pobyt nenajdeme.", "We can't find this stay.")}</p>
      </AppShell>
    );
  }

  const isAdmin =
    account?.type === "INSTITUTIONAL" &&
    (currentMember?.role === "ADMIN" || currentMember?.role === "OWNER");
  const pending = booking.status === "PENDING";
  // Who may cancel: the person who booked it, or an admin (the database policy says the same).
  // A stay that has already ended stays in the history (T-026: anyone saw "Cancel stay" on
  // every stay, past ones included, and one tap deleted it).
  const isAnyAdmin = currentMember?.role === "ADMIN" || currentMember?.role === "OWNER";
  const isBooker = !!currentMember && booking.requester_member_id === currentMember.id;
  const canCancel = (isBooker || isAnyAdmin) && booking.end_date >= todayISO();

  const guestsLabel =
    lang === "en"
      ? `${booking.guests} ${booking.guests === 1 ? "guest" : "guests"}`
      : `${booking.guests} ${booking.guests === 1 ? "host" : booking.guests < 5 ? "hosté" : "hostů"}`;

  return (
    <AppShell>
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate({ to: "/kalendar" })}
          aria-label={t("Zpět", "Back")}
          className="grid size-11 place-items-center rounded-xl bg-secondary"
        >
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="text-2xl font-bold">{t("Detail pobytu", "Stay detail")}</h1>
      </div>

      <section className="card mt-4 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{booking.requester_name}</h2>
          {pending ? (
            <PillWarn>{t("Čeká na schválení", "Awaiting approval")}</PillWarn>
          ) : (
            <PillOk>{t("Potvrzeno", "Confirmed")}</PillOk>
          )}
        </div>

        <div className="mt-3 space-y-3">
          <div className="flex items-center gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-muted-foreground">
              <CalendarDays className="size-5" />
            </div>
            <p className="text-[16px] font-bold">
              {fmtDate(booking.start_date)} – {fmtDate(booking.end_date)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-muted-foreground">
              <Users className="size-5" />
            </div>
            <p className="text-[16px] font-semibold">{guestsLabel}</p>
          </div>
        </div>

        {booking.note && (
          <p className="mt-3 rounded-2xl bg-background p-3 text-[15px]">„{booking.note}“</p>
        )}

        <p className="mt-3 text-[12px] text-muted-foreground">
          {t("Vytvořeno", "Created")} {fmtDateTime(booking.created_at)}
        </p>
      </section>

      {pending && (
        <section
          className="mt-4 space-y-2 text-[16px]"
          aria-label={t("Schválení pobytu", "Stay approval")}
        >
          <p className="break-words font-semibold">
            {t("Schvaluje:", "Approved by:")}{" "}
            {members
              .filter((member) => member.role === "ADMIN" || member.role === "OWNER")
              .map((member) => member.name)
              .join(", ") || t("Správce chaty", "The cottage administrator")}
          </p>
          <p>
            {t(
              "Správce rozhodne a uvidíte to tady.",
              "The administrator decides and you'll see it here.",
            )}
          </p>
        </section>
      )}

      {pending && isAdmin && (
        <div className="mt-4 flex gap-2">
          <button onClick={() => confirm.mutate()} className="btn-dark flex-1">
            {t("Schválit", "Approve")}
          </button>
          <button onClick={() => setConfirmRemove(true)} className="btn-secondary flex-1">
            {t("Zamítnout", "Decline")}
          </button>
        </div>
      )}

      {!pending && canCancel && (
        <button onClick={() => setConfirmRemove(true)} className="btn-danger mt-4 w-full">
          {t("Zrušit pobyt", "Cancel stay")}
        </button>
      )}

      <ConfirmDialog
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        title={
          pending
            ? t("Zamítnout tuto žádost o pobyt?", "Decline this stay request?")
            : t("Zrušit tento pobyt?", "Cancel this stay?")
        }
        description={t(
          `${booking.requester_name}, ${fmtDate(booking.start_date)} – ${fmtDate(booking.end_date)}. Pobyt zmizí z kalendáře a nelze ho vrátit.`,
          `${booking.requester_name}, ${fmtDate(booking.start_date)} – ${fmtDate(booking.end_date)}. The stay will disappear from the calendar; this can't be undone.`,
        )}
        confirmLabel={pending ? t("Zamítnout", "Decline") : t("Zrušit pobyt", "Cancel stay")}
        busy={remove.isPending}
        onConfirm={() => remove.mutate()}
      />

      {pending && !isAdmin && (
        <p className="mt-4 text-center text-[14px] font-semibold text-muted-foreground">
          <PillNeutral>
            {t("Schválit může pouze správce.", "Only an admin can approve.")}
          </PillNeutral>
        </p>
      )}
    </AppShell>
  );
}

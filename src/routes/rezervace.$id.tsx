import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, Users } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { PillNeutral, PillOk, PillWarn, Skeleton } from "@/components/bits";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/account";
import { fmtDate, fmtDateTime, type Booking } from "@/lib/data";

export const Route = createFileRoute("/rezervace/$id")({
  head: () => ({
    meta: [
      { title: "Detail pobytu — My Chata" },
      { name: "description", content: "Detail rezervace pobytu na chatě." },
      { property: "og:title", content: "Detail pobytu — My Chata" },
      { property: "og:description", content: "Detail rezervace pobytu na chatě." },
    ],
  }),
  component: BookingDetail,
});

function BookingDetail() {
  const { id } = Route.useParams();
  const { account, currentMember } = useAccount();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: booking, isLoading } = useQuery({
    queryKey: ["booking", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("bookings").select("*").eq("id", id).single();
      if (error) throw error;
      return data as Booking;
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["booking", id] });
    queryClient.invalidateQueries({ queryKey: ["bookings"] });
  };

  const confirm = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("bookings").update({ status: "CONFIRMED" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Pobyt schválen.");
      navigate({ to: "/kalendar" });
    },
    onError: () => toast.error("Akce se nepodařila."),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("bookings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Rezervace byla odstraněna.");
      navigate({ to: "/kalendar" });
    },
    onError: () => toast.error("Akce se nepodařila."),
  });

  if (isLoading || !booking) {
    return (
      <AppShell>
        <Skeleton className="h-40" />
        <Skeleton className="h-24" />
      </AppShell>
    );
  }

  const isAdmin = currentMember?.role === "ADMIN" || currentMember?.role === "OWNER" || account?.type === "INSTITUTIONAL";
  const pending = booking.status === "PENDING";

  return (
    <AppShell>
      <div className="flex items-center gap-2">
        <button onClick={() => navigate({ to: "/kalendar" })} aria-label="Zpět" className="grid size-11 place-items-center rounded-xl bg-secondary">
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="text-2xl font-bold">Detail pobytu</h1>
      </div>

      <section className="card mt-4 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{booking.requester_name}</h2>
          {pending ? <PillWarn>Čeká na schválení</PillWarn> : <PillOk>Potvrzeno</PillOk>}
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
            <p className="text-[16px] font-semibold">
              {booking.guests} {booking.guests === 1 ? "host" : booking.guests < 5 ? "hosté" : "hostů"}
            </p>
          </div>
        </div>

        {booking.note && (
          <p className="mt-3 rounded-2xl bg-background p-3 text-[15px]">„{booking.note}“</p>
        )}

        <p className="mt-3 text-[12px] text-muted-foreground">
          Vytvořeno {fmtDateTime(booking.created_at)}
        </p>
      </section>

      {pending && isAdmin && (
        <div className="mt-4 flex gap-2">
          <button onClick={() => confirm.mutate()} className="btn-primary flex-1">Schválit</button>
          <button onClick={() => remove.mutate()} className="btn-danger flex-1">Zamítnout</button>
        </div>
      )}

      {!pending && (
        <button onClick={() => remove.mutate()} className="btn-danger mt-4 w-full">
          Zrušit pobyt
        </button>
      )}

      {pending && !isAdmin && (
        <p className="mt-4 text-center text-[14px] font-semibold text-muted-foreground">
          <PillNeutral>Schválit může pouze správce.</PillNeutral>
        </p>
      )}
    </AppShell>
  );
}

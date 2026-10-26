import { Button } from "@/components/ui/button";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Inbox } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Avatar, EmptyState, LoadingCards, PageHeader } from "@/components/bits";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/account";
import { fmtDate, guestCount, type Booking } from "@/lib/data";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/schvalovani")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Ke schválení — My Chata" },
      { name: "description", content: "Overview of bookings awaiting approval." },
      { property: "og:title", content: "Ke schválení — My Chata" },
      { property: "og:description", content: "Overview of bookings awaiting approval." },
    ],
  }),
  component: ApprovalsPage,
});

function ApprovalsPage() {
  const { account, property, currentMember } = useAccount();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t, lang } = useLang();

  useEffect(() => {
    if (account?.type === "FAMILY") navigate({ to: "/kalendar", replace: true });
  }, [account?.type, navigate]);

  const [declining, setDeclining] = useState<Booking | null>(null);

  // Own cache entry: Home and Calendar keep ALL stays under ["bookings", id]. Sharing that key
  // made this page list confirmed stays as "awaiting approval" (and Decline deletes), or made
  // Calendar show only the pending ones, depending on which page was opened first (T-026).
  const {
    data: pending,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["bookings", property?.id, "pending"],
    enabled: !!property && account?.type !== "FAMILY",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("property_id", property!.id)
        .eq("status", "PENDING")
        .order("start_date");
      if (error) throw error;
      return (data as Booking[]).filter((b) => b.status === "PENDING");
    },
  });

  const decide = useMutation({
    mutationFn: async ({ id, approve }: { id: string; approve: boolean }) => {
      // Row-level security turns a refused change into "0 rows", not an error: check it.
      const { data, error } = approve
        ? await supabase
            .from("bookings")
            .update({ status: "CONFIRMED" })
            .eq("id", id)
            .eq("status", "PENDING")
            .select("id")
        : await supabase
            .from("bookings")
            .delete()
            .eq("id", id)
            .eq("status", "PENDING")
            .select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("nothing_changed");
    },
    onSuccess: (_d, v) => {
      setDeclining(null);
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      toast.success(
        v.approve
          ? t("Rezervace schválena.", "Booking approved.")
          : t("Rezervace zamítnuta.", "Booking declined."),
      );
    },
    onError: (e: Error) => {
      setDeclining(null);
      void queryClient.invalidateQueries({ queryKey: ["bookings"] });
      toast.error(
        e.message === "nothing_changed"
          ? t(
              "Nic se nezměnilo: o rezervaci už bylo rozhodnuto, nebo k tomu nemáte oprávnění.",
              "Nothing changed: the booking was already decided, or you are not allowed to.",
            )
          : t("Akce se nepodařila.", "The action failed."),
      );
    },
  });

  if (account?.type === "FAMILY") return null;

  const isAdmin = currentMember?.role === "ADMIN" || currentMember?.role === "OWNER";

  return (
    <AppShell>
      <PageHeader
        title={t("Ke schválení", "Approvals")}
        subtitle={t(
          "Rezervace členů, které čekají na vaše rozhodnutí.",
          "Members' bookings awaiting your decision.",
        )}
      />

      {isLoading ? (
        <LoadingCards />
      ) : isError && !pending ? (
        <div role="alert" className="card p-4">
          <p className="font-bold">
            {t("Rezervace se nepodařilo načíst.", "Could not load the bookings.")}
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
      ) : !pending?.length ? (
        <EmptyState
          icon={Inbox}
          title={t("Žádné rezervace ke schválení.", "No bookings awaiting approval.")}
          hint={t("Všechny žádosti jsou vyřízené.", "All requests have been handled.")}
        />
      ) : (
        <div className="space-y-3">
          {pending.map((b) => (
            <article key={b.id} className="rounded-[20px] bg-card p-[14px] shadow-chip">
              <div className="flex items-center gap-3">
                <Avatar name={b.requester_name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-bold">{b.requester_name}</p>
                  <p className="text-[16px] text-muted-foreground">
                    {fmtDate(b.start_date)} – {fmtDate(b.end_date)} · {guestCount(b.guests, lang)}
                  </p>
                </div>
              </div>
              {b.note && (
                <p className="mt-2 rounded-2xl bg-background p-3 text-[16px]">„{b.note}“</p>
              )}
              {isAdmin ? (
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="fresh"
                    size="fresh"
                    onClick={() => decide.mutate({ id: b.id, approve: true })}
                    disabled={decide.isPending}
                    className="btn-dark flex-1"
                  >
                    {t("Schválit", "Approve")}
                  </Button>
                  <Button
                    variant="fresh"
                    size="fresh"
                    onClick={() => setDeclining(b)}
                    className="btn-secondary flex-1"
                  >
                    {t("Zamítnout", "Decline")}
                  </Button>
                </div>
              ) : (
                <p className="mt-3 text-[16px] font-semibold text-muted-foreground">
                  {t("Schválit může správce rodiny.", "Only the family admin can approve.")}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
      <ConfirmDialog
        open={!!declining}
        onOpenChange={(open) => !open && setDeclining(null)}
        title={t(
          `Zamítnout rezervaci ${declining?.requester_name ?? ""}?`,
          `Decline ${declining?.requester_name ?? ""}'s booking?`,
        )}
        description={
          declining
            ? t(
                `${fmtDate(declining.start_date)} – ${fmtDate(declining.end_date)}. Rezervace bude smazána a nelze ji vrátit.`,
                `${fmtDate(declining.start_date)} – ${fmtDate(declining.end_date)}. The booking will be deleted; this can't be undone.`,
              )
            : ""
        }
        confirmLabel={t("Zamítnout", "Decline")}
        busy={decide.isPending}
        onConfirm={() => declining && decide.mutate({ id: declining.id, approve: false })}
      />
    </AppShell>
  );
}

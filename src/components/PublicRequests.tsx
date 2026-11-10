import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Globe, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PillNeutral, PillPublic, PillWarn } from "@/components/bits";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/account";
import { track } from "@/lib/analytics";
import { fmtDate, fmtDateTime, todayISO } from "@/lib/data";
import { usePendingGuestRequests } from "@/lib/guest-requests";
import { useLang } from "@/lib/i18n";
import { inviteLink, inviteMailto } from "@/lib/invites";

/**
 * Booking requests from people outside the cottage: the guest link (no account) and the public
 * calendar (T-021, T-043). They used to be decided on Home; since T-069 they are listed on the
 * Requests page with every other request, in their own violet look so an admin can tell them
 * from members and employees at a glance. Renders nothing when none wait.
 */
export function PublicRequests() {
  const { t, lang } = useLang();
  const { account, property, currentMember } = useAccount();
  const isAdmin = currentMember?.role === "ADMIN" || currentMember?.role === "OWNER";
  const { data: guestRequests } = usePendingGuestRequests(property?.id, isAdmin);
  const today = todayISO();
  const guestsLabel = (n: number) => {
    if (lang === "en") return n === 1 ? "guest" : "guests";
    return n === 1 ? "host" : n < 5 ? "hosté" : "hostů";
  };
  const queryClient = useQueryClient();
  // D-30: after approving a visitor from the public calendar, offer to invite them as a member
  // so they book in the app next time. Never automatic: members see more than a visitor.
  const [inviteOffer, setInviteOffer] = useState<{ email: string; name: string } | null>(null);
  const inviteVisitor = useMutation({
    mutationFn: async (visitor: { email: string; name: string }) => {
      const token = crypto.randomUUID();
      const { error } = await supabase.from("invitations").insert({
        account_id: account!.id,
        property_id: property?.id ?? null,
        email: visitor.email.toLowerCase(),
        role: "MEMBER",
        token,
        created_by_member_id: currentMember?.id ?? null,
      });
      if (error) throw error;
      return { token, visitor };
    },
    onSuccess: ({ token, visitor }) => {
      track("invitation_sent", { result: "single", source: "public_calendar" });
      setInviteOffer(null);
      void queryClient.invalidateQueries({ queryKey: ["invitations"] });
      const mailto = inviteMailto({
        to: visitor.email,
        link: inviteLink(window.location.origin, token),
        chata: property?.name ?? "",
        inviter: currentMember?.name ?? null,
        admin: false,
        lang,
      });
      toast.success(
        t(
          `Pozvánka pro ${visitor.name} vytvořena. Najdete ji i v Členech a oprávněních.`,
          `Invitation for ${visitor.name} created. It is also listed in Members & permissions.`,
        ),
        {
          duration: 15000,
          action: {
            label: t("Poslat e-mailem", "Send by email"),
            onClick: () => {
              window.location.href = mailto;
            },
          },
        },
      );
    },
    onError: (error) => {
      console.error("[requests] invite visitor", error);
      setInviteOffer(null);
      toast.error(
        t(
          `Pozvánku se nepodařilo vytvořit: ${error.message}`,
          `The invitation could not be created: ${error.message}`,
        ),
      );
    },
  });

  const decideGuest = useMutation({
    mutationFn: async ({
      id,
      approve,
    }: {
      id: string;
      approve: boolean;
      visitor?: { email: string; name: string } | null;
    }) => {
      const { error } = await supabase.rpc("decide_guest_request", {
        _request_id: id,
        _approve: approve,
      });
      if (error) throw error;
    },
    onSuccess: async (_d, { approve, visitor }) => {
      if (approve && visitor?.email && account) {
        // Only offer when they are neither a member nor already invited (25 Oct review).
        const email = visitor.email.toLowerCase();
        const [{ data: invited, error: invErr }, { data: member, error: memErr }] =
          await Promise.all([
            supabase
              .from("invitations")
              .select("id")
              .eq("account_id", account.id)
              .ilike("email", email)
              .eq("status", "PENDING")
              .limit(1),
            supabase
              .from("members")
              .select("id")
              .eq("account_id", account.id)
              .ilike("email", email)
              .limit(1),
          ]);
        if (invErr || memErr) console.error("[requests] invite check", invErr ?? memErr);
        else if (!invited?.length && !member?.length) setInviteOffer(visitor);
      }
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
      console.error("[requests] decide guest request", error);
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

  // Kept mounted after the last request is approved: the invite offer opens just then.
  const inviteDialog = (
    <ConfirmDialog
      open={!!inviteOffer}
      onOpenChange={(open) => !open && setInviteOffer(null)}
      title={t(
        `Pozvat ${inviteOffer?.name ?? ""} do chaty jako člena?`,
        `Invite ${inviteOffer?.name ?? ""} to the cottage as a member?`,
      )}
      description={t(
        `Pobyt je potvrzený. Jako člen si ${inviteOffer?.name ?? ""} příště zapíše pobyt sám v aplikaci, ale uvidí i kalendář, výdaje a manuál chaty. Pozvánka půjde na ${inviteOffer?.email ?? ""}.`,
        `The stay is confirmed. As a member, ${inviteOffer?.name ?? ""} can book in the app next time, but will also see the cottage's calendar, expenses and manual. The invitation goes to ${inviteOffer?.email ?? ""}.`,
      )}
      confirmLabel={t("Pozvat", "Invite")}
      tone="primary"
      busy={inviteVisitor.isPending}
      onConfirm={() => inviteOffer && inviteVisitor.mutate(inviteOffer)}
    />
  );

  if (!isAdmin || !guestRequests?.length) return inviteDialog;

  return (
    <section aria-label={t("Veřejné žádosti", "Public requests")}>
      <h2 className="mb-2 text-lg font-bold">
        {t("Veřejné žádosti", "Public requests")} ({guestRequests.length})
      </h2>
      <div className="space-y-3">
        {guestRequests.map((g) => {
          // O-27: dates passed with nobody deciding. No Confirm (stays in the past are not
          // added, O-25); Decline clears it.
          const undecided = g.end_date < today;
          return (
            <div
              key={g.id}
              data-testid="public-request"
              className="rounded-2xl border-l-4 border-public bg-public-soft p-3"
            >
              <PillPublic>
                <Globe className="size-4" aria-hidden />
                {t("Veřejná žádost", "Public request")}
              </PillPublic>
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="truncate text-[16px] font-bold">{g.guest_name}</p>
                {undecided ? (
                  <PillNeutral>{t("Nerozhodnuto", "Not decided")}</PillNeutral>
                ) : (
                  <PillWarn>{t("Čeká", "Pending")}</PillWarn>
                )}
              </div>
              <p className="text-[16px] text-muted-foreground">
                {fmtDate(g.start_date)} – {fmtDate(g.end_date)} · {g.guests} {guestsLabel(g.guests)}{" "}
                · {g.guest_email}
              </p>
              {/* The requester's note (26 Oct check: admins saw it only after approving). */}
              {g.note && <p className="mt-1 text-[16px] italic text-foreground">„{g.note}“</p>}
              {/* When and where it came from (T-043): the public calendar needs an account. */}
              <p className="text-[14px] text-muted-foreground">
                {(g as { source?: string }).source === "public_calendar"
                  ? t("Z veřejného kalendáře", "From the public calendar")
                  : t("Z odkazu pro hosty", "From the guest link")}{" "}
                · {t("požádáno", "requested")} {fmtDateTime(g.created_at)}
              </p>
              <div className={`mt-2 grid gap-2 ${undecided ? "grid-cols-1" : "grid-cols-2"}`}>
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
                      {!undecided && (
                        <Button
                          variant="fresh"
                          size="fresh"
                          className="btn-primary disabled:opacity-50"
                          disabled={decideGuest.isPending}
                          aria-busy={busyApprove}
                          onClick={() =>
                            decideGuest.mutate({
                              id: g.id,
                              approve: true,
                              visitor:
                                (g as { source?: string }).source === "public_calendar" &&
                                g.guest_email
                                  ? { email: g.guest_email, name: g.guest_name }
                                  : null,
                            })
                          }
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
                      )}
                    </>
                  );
                })()}
              </div>
              {undecided && (
                <p className="mt-2 text-[16px] text-muted-foreground">
                  {t(
                    "Termín uplynul a nikdo o žádosti nerozhodl.",
                    "The dates passed and nobody decided on this request.",
                  )}
                </p>
              )}
            </div>
          );
        })}
      </div>
      {inviteDialog}
    </section>
  );
}

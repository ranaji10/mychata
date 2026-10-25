import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Crown, LogOut } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/account";
import { track } from "@/lib/analytics";
import { fmtDate } from "@/lib/data";
import { useLang } from "@/lib/i18n";
import {
  accountOfferKey,
  myOffersKey,
  ownershipError,
  useMyOwnershipOffers,
  useOpenOwnershipOffer,
} from "@/lib/ownership";

/**
 * "X wants to hand you the account" with Accept / Decline (25 Oct 2026). Shown on Members and
 * Notifications for offers in any of the person's accounts; accepting makes them the owner.
 */
export function OwnershipOffersToMe() {
  const { t } = useLang();
  const { user } = useAccount();
  const queryClient = useQueryClient();
  const { data: offers } = useMyOwnershipOffers(user?.id);
  const respond = useMutation({
    mutationFn: async ({ id, accept }: { id: string; accept: boolean }) => {
      const { error } = await supabase.rpc("respond_account_ownership", {
        _offer_id: id,
        _accept: accept,
      });
      if (error) throw error;
    },
    onSuccess: async (_d, { accept }) => {
      track("ownership_decided", { result: accept ? "accepted" : "declined" });
      await queryClient.invalidateQueries();
      toast.success(
        accept
          ? t("Jste teď vlastníkem účtu.", "You are now the account's owner.")
          : t("Nabídku jste odmítli.", "You declined the offer."),
      );
    },
    onError: (error) => {
      console.error("[ownership] respond", error);
      void queryClient.invalidateQueries({ queryKey: myOffersKey(user?.id) });
      toast.error(ownershipError(error.message, t));
    },
  });

  if (!offers?.length) return null;
  return (
    <>
      {offers.map((o) => {
        const busy = respond.isPending && respond.variables?.id === o.id;
        return (
          <section key={o.id} className="card mt-4 border-2 border-primary/40 p-4">
            <h2 className="flex items-center gap-2 text-[16px] font-bold">
              <Crown className="size-5 text-primary" />
              {t("Nabídka vlastnictví účtu", "Account ownership offer")}
            </h2>
            <p className="mt-1 text-[16px]">
              {t(
                `${o.from_name} vám chce předat účet „${o.account_name}“ (${fmtDate(o.created_at)}).`,
                `${o.from_name} wants to hand you the account “${o.account_name}” (${fmtDate(o.created_at)}).`,
              )}
            </p>
            <p className="mt-1 text-[16px] text-muted-foreground">
              {t(
                "Jako vlastník budete jediný, kdo mění typ účtu a předává ho dál; později i spravuje předplatné. Dosavadní vlastník zůstane správcem.",
                "As the owner you alone change the account type and hand it on; later also manage the subscription. The current owner stays an admin.",
              )}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button
                variant="fresh"
                size="fresh"
                className="btn-secondary disabled:opacity-50"
                disabled={respond.isPending}
                onClick={() => respond.mutate({ id: o.id, accept: false })}
              >
                {t("Odmítnout", "Decline")}
              </Button>
              <Button
                variant="fresh"
                size="fresh"
                className="btn-primary disabled:opacity-50"
                disabled={respond.isPending}
                aria-busy={busy}
                onClick={() => respond.mutate({ id: o.id, accept: true })}
              >
                {busy ? t("Ukládám…", "Saving…") : t("Přijmout", "Accept")}
              </Button>
            </div>
          </section>
        );
      })}
    </>
  );
}

/**
 * "Leave this account" at the bottom of Members & permissions (25 Oct 2026). Members and admins
 * leave after settling their debts; the owner first hands the account over and the new owner
 * accepts. Leaving covers every cottage of the account (membership is per account).
 */
export function LeaveAccountCard() {
  const { t } = useLang();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { account, currentMember, members, memberships } = useAccount();
  const isOwner = currentMember?.role === "OWNER";
  const { data: openOffer } = useOpenOwnershipOffer(account?.id, isOwner);
  const [confirm, setConfirm] = useState(false);

  const cancelOffer = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("cancel_account_ownership", { _offer_id: id });
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: accountOfferKey(account?.id) });
      toast.success(t("Nabídka zrušena.", "Offer cancelled."));
    },
    onError: (error) => toast.error(ownershipError(error.message, t)),
  });

  const leave = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("leave_account", { _account_id: account!.id });
      if (error) throw error;
      return data;
    },
    onSuccess: async (next) => {
      track("account_left", {});
      setConfirm(false);
      try {
        localStorage.removeItem("mychata.offline-cache");
      } catch {
        /* ignore */
      }
      await queryClient.invalidateQueries();
      toast.success(
        t(`Opustili jste účet „${account?.name ?? ""}“.`, `You left “${account?.name ?? ""}”.`),
      );
      void navigate({ to: next ? "/domu" : "/onboarding", replace: true });
    },
    onError: (error) => {
      console.error("[leave] account", error);
      setConfirm(false);
      toast.error(ownershipError(error.message, t));
    },
  });

  if (!account || !currentMember) return null;
  const offeredTo = openOffer ? members.find((m) => m.id === openOffer.to_member_id) : null;
  const otherAccounts = memberships.filter((m) => m.account_id !== account.id).length;

  return (
    <section className="card mt-6 p-4">
      <h2 className="flex items-center gap-2 text-[16px] font-bold">
        <LogOut className="size-5 text-destructive" />
        {t("Odejít z účtu", "Leave this account")}
      </h2>
      {isOwner ? (
        <>
          <p className="mt-1 text-[16px] text-muted-foreground">
            {t(
              "Jste vlastník účtu, takže z něj zatím odejít nemůžete. Nejdřív u některého člena zvolte „Předat vlastnictví“. Až ho přijme, budete správcem a odejít půjde.",
              "You own this account, so you can't leave it yet. First choose “Hand over ownership” next to a member. Once they accept, you're an admin and can leave.",
            )}
          </p>
          {openOffer && (
            <div className="mt-3 rounded-2xl bg-secondary p-3">
              <p className="text-[16px] font-semibold">
                {t(
                  `Čeká na přijetí: ${offeredTo?.name ?? "—"} (nabídnuto ${fmtDate(openOffer.created_at)}).`,
                  `Waiting for ${offeredTo?.name ?? "—"} to accept (offered ${fmtDate(openOffer.created_at)}).`,
                )}
              </p>
              <Button
                variant="fresh"
                size="fresh"
                className="btn-secondary mt-2 w-full disabled:opacity-50"
                disabled={cancelOffer.isPending}
                onClick={() => cancelOffer.mutate(openOffer.id)}
              >
                {t("Zrušit nabídku", "Cancel the offer")}
              </Button>
            </div>
          )}
        </>
      ) : (
        <>
          <p className="mt-1 text-[16px] text-muted-foreground">
            {t(
              `Odejdete ze všech chat účtu „${account.name}“. Vaše pobyty a výdaje v něm zůstanou pod vaším jménem. Nejdřív vyrovnejte dluhy. Vrátit se půjde jen s novou pozvánkou.`,
              `You leave every cottage of “${account.name}”. Your stays and expenses there stay under your name. Settle your debts first. Coming back needs a new invitation.`,
            )}
          </p>
          <Button
            variant="fresh"
            size="fresh"
            className="btn-danger-soft mt-3 w-full"
            onClick={() => setConfirm(true)}
          >
            {t("Odejít z účtu", "Leave this account")}
          </Button>
          <ConfirmDialog
            open={confirm}
            onOpenChange={setConfirm}
            title={t(`Opustit účet „${account.name}“?`, `Leave “${account.name}”?`)}
            description={
              otherAccounts
                ? t(
                    "Přestanete vidět jeho chaty, kalendář, výdaje a dokumenty. Přepneme vás do dalšího vašeho účtu.",
                    "You will no longer see its cottages, calendar, expenses and documents. We'll switch you to your next account.",
                  )
                : t(
                    "Přestanete vidět jeho chaty, kalendář, výdaje a dokumenty. Jiný účet nemáte, takže pak můžete založit vlastní nebo přijmout pozvánku.",
                    "You will no longer see its cottages, calendar, expenses and documents. You have no other account, so you can then set one up or accept an invitation.",
                  )
            }
            confirmLabel={t("Odejít", "Leave")}
            busy={leave.isPending}
            onConfirm={() => leave.mutate()}
          />
        </>
      )}
    </section>
  );
}

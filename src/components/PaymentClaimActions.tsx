// "I paid" claims on screen (T-057): the debtor's button and waiting note, the payee's
// "Did it arrive?" choice. Used by Settle debts and the expense sheet.
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { fmtDate, fmtKcExact } from "@/lib/data";
import { expenseDataKey } from "@/lib/expenses";
import { useLang } from "@/lib/i18n";
import { paymentClaimsKey, type PaymentClaim } from "@/lib/payment-claims";
import { friendlyError } from "@/lib/rpc-errors";

function useRefresh(propertyId: string) {
  const client = useQueryClient();
  return async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: paymentClaimsKey(propertyId) }),
      client.invalidateQueries({ queryKey: expenseDataKey(propertyId) }),
      client.invalidateQueries({ queryKey: ["stored-notifications"] }),
    ]);
  };
}

/** The person who owes: "I've paid" (whole debt to `toName`, or one expense's share). */
export function ClaimPaidButton({
  propertyId,
  toMemberId,
  toName,
  expenseId = null,
  label,
}: {
  propertyId: string;
  toMemberId: string;
  toName: string;
  expenseId?: string | null;
  label?: string;
}) {
  const { t } = useLang();
  const refresh = useRefresh(propertyId);
  const [busy, setBusy] = useState(false);
  const claim = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("claim_payment", {
      _property_id: propertyId,
      _to_member_id: toMemberId,
      ...(expenseId ? { _expense_id: expenseId } : {}),
    });
    setBusy(false);
    if (error) {
      console.error("[payments] claim", error);
      toast.error(
        t(
          `Platbu se nepodařilo nahlásit: ${friendlyError(error.message, t)}`,
          `Could not report the payment: ${friendlyError(error.message, t)}`,
        ),
      );
      return;
    }
    toast.success(
      t(
        `Dali jsme vědět: ${toName}. Až platbu potvrdí, dluh zmizí.`,
        `We told ${toName}. Once they confirm it, the debt disappears.`,
      ),
    );
    await refresh();
  };
  return (
    <Button
      variant="fresh"
      size="fresh"
      className="btn-secondary w-full whitespace-normal"
      disabled={busy}
      onClick={() => void claim()}
    >
      {busy
        ? t("Ukládám…", "Saving…")
        : (label ?? t(`Zaplatil(a) jsem: ${toName}`, `I've paid ${toName}`))}
    </Button>
  );
}

/** The debtor's view of an open claim. */
export function ClaimWaiting({ claim, toName }: { claim: PaymentClaim; toName: string }) {
  const { t } = useLang();
  return (
    <p className="flex items-start gap-2 rounded-2xl bg-secondary p-3 text-[16px] font-semibold text-muted-foreground">
      <Clock className="mt-0.5 size-5 shrink-0" aria-hidden />
      <span>
        {t(
          `Čeká na potvrzení: ${toName} (${fmtKcExact(claim.amount)}, nahlášeno ${fmtDate(claim.created_at)})`,
          `Waiting for ${toName} to confirm (${fmtKcExact(claim.amount)}, reported ${fmtDate(claim.created_at)})`,
        )}
      </span>
    </p>
  );
}

/** The payee (or an admin) decides: the money arrived, or it didn't. */
export function ClaimDecision({
  claim,
  fromName,
  forName,
}: {
  claim: PaymentClaim;
  fromName: string;
  /** Set when an admin decides for someone else. */
  forName?: string;
}) {
  const { t } = useLang();
  const refresh = useRefresh(claim.property_id);
  const [busy, setBusy] = useState(false);
  const decide = async (received: boolean) => {
    setBusy(true);
    const { error } = await supabase.rpc("decide_payment_claim", {
      _claim_id: claim.id,
      _received: received,
    });
    setBusy(false);
    if (error) {
      console.error("[payments] decide", error);
      toast.error(
        t(
          `Uložení se nepodařilo: ${friendlyError(error.message, t)}`,
          `Could not save: ${friendlyError(error.message, t)}`,
        ),
      );
      return;
    }
    toast.success(
      received
        ? t(`Potvrzeno. ${fromName} je vyrovnán(a).`, `Confirmed. ${fromName} is settled.`)
        : t(
            `${fromName} dostane zprávu, že platba zatím nepřišla.`,
            `${fromName} will hear that the payment hasn't arrived yet.`,
          ),
    );
    await refresh();
  };
  return (
    <div className="space-y-2 rounded-2xl bg-secondary p-3">
      <p className="text-[16px] font-semibold">
        {forName
          ? t(
              `${fromName} hlásí platbu ${fmtKcExact(claim.amount)} pro: ${forName}. Přišla?`,
              `${fromName} says they paid ${forName} ${fmtKcExact(claim.amount)}. Did it arrive?`,
            )
          : t(
              `${fromName} hlásí, že vám poslal(a) ${fmtKcExact(claim.amount)}. Přišla platba?`,
              `${fromName} says they paid you ${fmtKcExact(claim.amount)}. Did it arrive?`,
            )}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="fresh"
          size="fresh"
          className="btn-dark"
          disabled={busy}
          onClick={() => void decide(true)}
        >
          {t("Ano, přišla", "Yes, received")}
        </Button>
        <Button
          variant="fresh"
          size="fresh"
          className="btn-secondary bg-card"
          disabled={busy}
          onClick={() => void decide(false)}
        >
          {t("Nepřišla", "Not received")}
        </Button>
      </div>
    </div>
  );
}

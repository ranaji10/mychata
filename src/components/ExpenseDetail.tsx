import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/account";
import { useLang } from "@/lib/i18n";
import { fmtKc, type Expense, type ExpenseSplit } from "@/lib/data";
import { expenseDataKey } from "@/lib/expenses";
import { canCoverExpense } from "@/lib/ui-action-rules";

export function ExpenseDetail({
  expense,
  splits,
  onClose,
}: {
  expense: Expense;
  splits: ExpenseSplit[];
  onClose: () => void;
}) {
  const { t } = useLang();
  const { members, currentMember } = useAccount();
  const client = useQueryClient();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const payer = canCoverExpense(expense.paid_by_member_id, currentMember?.id);
  const canUpload = payer || currentMember?.role === "ADMIN" || currentMember?.role === "OWNER";
  const name = (id: string | null) =>
    members.find((member) => member.id === id)?.name ?? t("Člen", "Member");
  const receiptKey = ["expense-receipt", expense.property_id, expense.id];
  const { data: receipt, isError: receiptError } = useQuery({
    queryKey: receiptKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("receipt_photo_url")
        .eq("id", expense.id)
        .single();
      if (error) throw error;
      if (!data.receipt_photo_url) return null;
      const { data: url, error: urlError } = await supabase.storage
        .from("my-chata-files")
        .createSignedUrl(data.receipt_photo_url, 3600);
      if (urlError) throw urlError;
      return url.signedUrl;
    },
  });
  const failure = (message: string) =>
    toast.error(t(`Akce se nepodařila: ${message}`, `The action failed: ${message}`));
  const remind = async (memberId: string) => {
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("remind_debt", {
        _property_id: expense.property_id,
        _member_id: memberId,
      });
      if (error) throw error;
      toast.success(
        t(
          `Připomenutí přijato: ${fmtKc(Number(data))}.`,
          `Reminder accepted: ${fmtKc(Number(data))}.`,
        ),
      );
    } catch (error) {
      failure((error as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const cover = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.rpc("cover_expense", { _expense_id: expense.id });
      if (error) throw error;
      await client.invalidateQueries({ queryKey: expenseDataKey(expense.property_id) });
      toast.success(t("Výdaj hradíte celý.", "You are covering the full expense."));
      setConfirm(false);
      onClose();
    } catch (error) {
      failure((error as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const upload = async (file: File) => {
    setBusy(true);
    const path = `${expense.property_id}/receipts/${crypto.randomUUID()}`;
    try {
      const { error } = await supabase.storage.from("my-chata-files").upload(path, file);
      if (error) throw error;
      const { data, error: updateError } = await supabase
        .from("expenses")
        .update({ receipt_photo_url: path })
        .eq("id", expense.id)
        .select("id");
      if (updateError || !data?.length) {
        const { error: cleanupError } = await supabase.storage
          .from("my-chata-files")
          .remove([path]);
        if (cleanupError) console.error("Receipt cleanup failed", cleanupError);
        throw updateError ?? new Error("nothing_changed");
      }
      await client.invalidateQueries({ queryKey: receiptKey });
      toast.success(t("Účtenka uložena.", "Receipt saved."));
    } catch (error) {
      failure((error as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const payerShare = Math.max(
    0,
    Number(expense.amount) - splits.reduce((sum, split) => sum + Number(split.amount_owed), 0),
  );
  return (
    <>
      <Sheet open onOpenChange={(open) => !open && onClose()}>
        <SheetContent
          side="bottom"
          className="mx-auto max-h-[90dvh] max-w-[720px] overflow-y-auto rounded-t-[28px] bg-card p-5 [&>button]:grid [&>button]:size-11 [&>button]:place-items-center [&>button]:rounded-full [&>button]:bg-secondary"
        >
          <SheetHeader className="pr-12">
            <SheetTitle className="text-xl">
              {expense.description ?? t("Výdaj", "Expense")}
            </SheetTitle>
            <SheetDescription className="text-[16px]">
              {t("Zaplatil(a)", "Paid by")}: {name(expense.paid_by_member_id)} ·{" "}
              {fmtKc(Number(expense.amount))}
            </SheetDescription>
          </SheetHeader>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 size-11 rounded-full bg-secondary"
            aria-label={t("Zavřít", "Close")}
            onClick={onClose}
          >
            ×
          </Button>
          <ul className="my-4 divide-y divide-divider">
            <li className="flex flex-wrap justify-between gap-2 py-3 text-[16px]">
              <span>{name(expense.paid_by_member_id)}</span>
              <span>
                {fmtKc(payerShare)} · {t("Zaplaceno", "Paid")}
              </span>
            </li>
            {splits.map((split) => (
              <li key={split.id} className="space-y-2 py-3">
                <div className="flex flex-wrap justify-between gap-2 text-[16px]">
                  <span>{name(split.member_id)}</span>
                  <span>
                    {fmtKc(Number(split.amount_owed))} ·{" "}
                    {split.paid_back ? t("Vyrovnáno", "Settled") : t("Dluží", "Owes")}
                  </span>
                </div>
                {payer &&
                  !split.paid_back &&
                  members.some((member) => member.id === split.member_id && !member.left_at) && (
                    <Button
                      variant="fresh"
                      size="fresh"
                      className="btn-secondary w-full"
                      disabled={busy}
                      onClick={() => void remind(split.member_id)}
                    >
                      {t("Připomenout", "Remind")}
                    </Button>
                  )}
              </li>
            ))}
          </ul>
          {receiptError && (
            <p role="alert" className="text-destructive">
              {t("Účtenku se nepodařilo načíst.", "Could not load the receipt.")}
            </p>
          )}
          {receipt && (
            <a href={receipt} target="_blank" rel="noreferrer" className="block">
              <img
                src={receipt}
                alt={t("Fotografie účtenky", "Receipt photo")}
                className="max-h-80 w-full rounded-xl object-contain"
              />
            </a>
          )}
          {canUpload && (
            <label className="btn-secondary my-3 w-full cursor-pointer whitespace-normal">
              <Camera className="size-5" />
              {t("Nahrát účtenku", "Upload receipt")}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={busy}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void upload(file);
                }}
              />
            </label>
          )}
          {payer && splits.some((split) => !split.paid_back) && (
            <Button
              variant="fresh"
              size="fresh"
              className="btn-danger-soft mt-3 w-full"
              disabled={busy}
              onClick={() => setConfirm(true)}
            >
              {t("Uhradím vše", "Cover it all")}
            </Button>
          )}
        </SheetContent>
      </Sheet>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={t("Uhradit celý výdaj?", "Cover the full expense?")}
        description={t(
          "Zbývající dluhy u tohoto výdaje budou odpuštěny. Tuto akci nelze vrátit.",
          "The remaining debts for this expense will be forgiven. This can't be undone.",
        )}
        confirmLabel={t("Uhradím vše", "Cover it all")}
        busy={busy}
        onConfirm={() => void cover()}
      />
    </>
  );
}

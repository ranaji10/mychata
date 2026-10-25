import { useQueryClient } from "@tanstack/react-query";
import { Repeat } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/account";
import { accountTypeChangeError, nextTypeChange } from "@/lib/account-type";
import { fmtDate } from "@/lib/data";
import { useLang } from "@/lib/i18n";

/**
 * "Account type" on My profile, shown to the account's owner only (T-045, D-03).
 * An organisation can become a family account again; a family turns into an organisation
 * through "Institutional account" below (it needs a work-email sign-in). Either way the owner
 * may change the type once in six months; the database enforces it (change_account_type()).
 */
export function AccountTypeCard() {
  const { t } = useLang();
  const queryClient = useQueryClient();
  const { account, currentMember } = useAccount();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  if (!account || currentMember?.role !== "OWNER") return null;
  const isOrg = account.type === "INSTITUTIONAL";
  const nextChange = nextTypeChange(account.type_changed_at ?? null);

  const changeToFamily = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("change_account_type", {
      _account_id: account.id,
      _to: "FAMILY",
      _name: name.trim() || account.name,
    });
    setBusy(false);
    if (error) {
      console.error("[account-type] change", error);
      toast.error(accountTypeChangeError(error.message, t));
      return;
    }
    await queryClient.invalidateQueries();
    setOpen(false);
    toast.success(
      t(
        "Hotovo. Účet je teď rodinný. Typ lze znovu změnit za 6 měsíců.",
        "Done. This is now a family account. The type can be changed again in 6 months.",
      ),
    );
  };

  return (
    <section className="card mt-4 p-4">
      <h2 className="flex items-center gap-2 text-[16px] font-bold">
        <Repeat className="size-5 text-primary" />
        {t("Typ účtu", "Account type")}
      </h2>
      <p className="mt-1 text-[16px]">
        <span className="font-semibold">{account.name}</span>
        {" · "}
        {isOrg ? t("organizace", "organisation") : t("rodina", "family")}
      </p>
      <p className="mt-1 text-[16px] text-muted-foreground">
        {nextChange
          ? t(
              `Typ účtu jste nedávno změnili. Znovu ho můžete změnit od ${fmtDate(nextChange)}.`,
              `You changed the account type recently. You can change it again from ${fmtDate(nextChange)}.`,
            )
          : isOrg
            ? t(
                "Jako vlastník můžete organizaci převést zpět na rodinný účet. Typ účtu lze měnit jednou za 6 měsíců.",
                "As the owner you can turn the organisation back into a family account. The account type can change once in 6 months.",
              )
            : t(
                "Na organizaci účet převedete níže v části „Účet instituce“. Typ účtu lze měnit jednou za 6 měsíců.",
                "To turn this account into an organisation, use “Institutional account” below. The account type can change once in 6 months.",
              )}
      </p>
      {isOrg && !nextChange && !open && (
        <Button
          variant="fresh"
          size="fresh"
          className="btn-secondary mt-3 w-full"
          onClick={() => setOpen(true)}
        >
          {t("Převést na rodinný účet", "Change to a family account")}
        </Button>
      )}
      {isOrg && !nextChange && open && (
        <div className="mt-3 space-y-3">
          <div>
            <label htmlFor="family-name" className="label-text text-[16px]">
              {t("Název rodinného účtu", "Family account name")}
            </label>
            <input
              id="family-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={account.name}
              className="field"
            />
            <p className="mt-1 text-[16px] text-muted-foreground">
              {t(
                "Například příjmení rodiny. Nesmí se jmenovat stejně jako chata.",
                "For example the family name. It can't be the same as a cottage's name.",
              )}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="fresh"
              size="fresh"
              className="btn-secondary"
              onClick={() => setOpen(false)}
              disabled={busy}
            >
              {t("Zrušit", "Cancel")}
            </Button>
            <Button
              variant="fresh"
              size="fresh"
              className="btn-primary disabled:opacity-50"
              onClick={changeToFamily}
              disabled={busy}
            >
              {busy ? t("Ukládám…", "Saving…") : t("Převést", "Change")}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

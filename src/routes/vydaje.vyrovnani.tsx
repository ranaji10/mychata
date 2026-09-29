import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, HandCoins } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Avatar, EmptyState, LoadingCards } from "@/components/bits";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/account";
import { fmtKc, settlementSuggestions } from "@/lib/data";
import { expenseDataKey, useExpenseData } from "@/lib/expenses";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/vydaje/vyrovnani")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Settlement — My Chata" },
      {
        name: "description",
        content: "Settlement suggestions for shared expenses between members.",
      },
      { property: "og:title", content: "Settlement — My Chata" },
      {
        property: "og:description",
        content: "Settlement suggestions for shared expenses between members.",
      },
    ],
  }),
  component: SettlementPage,
});

function SettlementPage() {
  const { t } = useLang();
  const { property, members, currentMember } = useAccount();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [settling, setSettling] = useState<string | null>(null);

  const { data, isLoading } = useExpenseData(property?.id);
  const isAdmin = currentMember?.role === "ADMIN" || currentMember?.role === "OWNER";

  const suggestions = useMemo(
    () => (data ? settlementSuggestions(data.expenses, data.splits) : []),
    [data],
  );

  const name = (id: string) => members.find((m) => m.id === id)?.name ?? "—";

  // One database step marks everything between the two people as paid, in both directions,
  // and refuses anyone but the receiver or an admin (settle_debt(), T-021).
  const settle = async (from: string, to: string) => {
    if (!property) return;
    setSettling(`${from}->${to}`);
    const { data: changed, error } = await supabase.rpc("settle_debt", {
      _property_id: property.id,
      _from: from,
      _to: to,
    });
    if (error) {
      setSettling(null);
      console.error("[vyrovnani] settle", error);
      toast.error(
        error.message.includes("only_receiver_confirms")
          ? t(
              `Přijetí platby potvrzuje ${name(to)} nebo správce.`,
              `${name(to)} or an admin confirms the payment.`,
            )
          : t(
              `Vyrovnání se nepodařilo uložit: ${error.message}`,
              `The settlement could not be saved: ${error.message}`,
            ),
      );
      return;
    }
    await queryClient.invalidateQueries({ queryKey: expenseDataKey(property.id) });
    setSettling(null);
    if (!changed) {
      toast.info(t("Nebylo co vyrovnat.", "There was nothing left to settle."));
      return;
    }
    toast.success(
      t(
        `${name(from)} a ${name(to)} jsou vyrovnáni.`,
        `${name(from)} and ${name(to)} are now settled.`,
      ),
    );
  };

  return (
    <AppShell>
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate({ to: "/vydaje" })}
          aria-label={t("Zpět", "Back")}
          className="grid size-11 place-items-center rounded-xl bg-secondary"
        >
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="text-2xl font-bold">{t("Vyrovnat dluhy", "Settle debts")}</h1>
      </div>

      {isLoading ? (
        <LoadingCards />
      ) : suggestions.length === 0 ? (
        <EmptyState
          icon={HandCoins}
          title={t("Všechno je vyrovnané.", "Everything is settled.")}
          hint={t("Nikdo nikomu nedluží.", "No one owes anyone.")}
        />
      ) : (
        <div className="mt-4 space-y-3">
          {suggestions.map((s) => (
            <div key={`${s.from}-${s.to}`} className="card p-4">
              <div className="flex items-center gap-3">
                <Avatar name={name(s.from)} />
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-bold">
                    {name(s.from)} → {name(s.to)}
                  </p>
                  <p className="text-[13px] text-muted-foreground">{t("dluží", "owes")}</p>
                </div>
                <p className="text-xl font-bold">{fmtKc(s.amount)}</p>
              </div>
              {currentMember?.id === s.to || isAdmin ? (
                <button
                  onClick={() => settle(s.from, s.to)}
                  disabled={settling === `${s.from}->${s.to}`}
                  className="btn-primary mt-3 w-full disabled:opacity-40"
                >
                  {settling === `${s.from}->${s.to}`
                    ? t("Ukládám…", "Saving…")
                    : currentMember?.id === s.to
                      ? t("Potvrdit přijetí platby", "Confirm payment received")
                      : t(
                          `Potvrdit za ${name(s.to)} (správce)`,
                          `Confirm for ${name(s.to)} (admin)`,
                        )}
                </button>
              ) : (
                <p className="mt-3 rounded-2xl bg-secondary p-3 text-[14px] font-semibold text-muted-foreground">
                  {currentMember?.id === s.from
                    ? t(
                        `Pošlete ${fmtKc(s.amount)} osobě ${name(s.to)}. Jakmile platbu potvrdí, dluh zmizí.`,
                        `Send ${fmtKc(s.amount)} to ${name(s.to)}. Once they confirm it, the debt disappears.`,
                      )
                    : t(
                        `Přijetí platby potvrzuje ${name(s.to)}.`,
                        `${name(s.to)} confirms receipt of payment.`,
                      )}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}

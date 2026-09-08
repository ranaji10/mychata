import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, HandCoins } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Avatar, EmptyState, LoadingCards } from "@/components/bits";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/account";
import { fmtKc, type Expense, type ExpenseSplit } from "@/lib/data";

export const Route = createFileRoute("/vydaje/vyrovnani")({
  head: () => ({
    meta: [
      { title: "Vyrovnání — My Chata" },
      { name: "description", content: "Návrhy vyrovnání sdílených výdajů mezi členy." },
      { property: "og:title", content: "Vyrovnat — My Chata" },
      { property: "og:description", content: "Návrhy vyrovnání sdílených výdajů mezi členy." },
    ],
  }),
  component: SettlementPage,
});

function SettlementPage() {
  const { property, members } = useAccount();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [settling, setSettling] = useState<string | null>(null);

  const { data: expenses, isLoading: le } = useQuery({
    queryKey: ["expenses", property?.id],
    enabled: !!property,
    queryFn: async () => {
      const { data, error } = await supabase.from("expenses").select("*").eq("property_id", property!.id);
      if (error) throw error;
      return data as Expense[];
    },
  });

  const { data: splits, isLoading: ls } = useQuery({
    queryKey: ["splits", property?.id],
    enabled: !!property && !!expenses,
    queryFn: async () => {
      const ids = expenses!.map((e) => e.id);
      if (!ids.length) return [] as ExpenseSplit[];
      const { data, error } = await supabase.from("expense_splits").select("*").in("expense_id", ids);
      if (error) throw error;
      return data as ExpenseSplit[];
    },
  });

  const suggestions = useMemo(() => {
    if (!splits || !expenses) return [];
    const payerOf = new Map(expenses.map((e) => [e.id, e.paid_by]));
    const owes = new Map<string, number>(); // "debtor->payer" => amount
    for (const s of splits) {
      if (s.paid_back) continue;
      const payer = payerOf.get(s.expense_id);
      if (!payer || payer === s.member_id) continue;
      const key = `${s.member_id}->${payer}`;
      owes.set(key, (owes.get(key) ?? 0) + Number(s.amount_owed));
    }
    // Net mutual debts
    const result: { from: string; to: string; amount: number }[] = [];
    const seen = new Set<string>();
    for (const [key, amount] of owes) {
      if (seen.has(key)) continue;
      const [from, to] = key.split("->");
      const reverseKey = `${to}->${from}`;
      const reverse = owes.get(reverseKey) ?? 0;
      seen.add(key);
      seen.add(reverseKey);
      const net = Math.round((amount - reverse) * 100) / 100;
      if (net > 0) result.push({ from, to, amount: net });
      else if (net < 0) result.push({ from: to, to: from, amount: -net });
    }
    return result.filter((r) => r.amount >= 1);
  }, [splits, expenses]);

  const name = (id: string) => members.find((m) => m.id === id)?.name ?? "—";

  const settle = async (from: string, to: string) => {
    if (!expenses) return;
    setSettling(`${from}->${to}`);
    const expenseIds = expenses.filter((e) => e.paid_by === to).map((e) => e.id);
    const { error } = await supabase
      .from("expense_splits")
      .update({ paid_back: true })
      .in("expense_id", expenseIds)
      .eq("member_id", from);
    setSettling(null);
    if (error) {
      toast.error("Vyrovnaní se nepodařilo uložit.");
      return;
    }
    toast.success(`${name(from)} a ${name(to)} jsou vyrovnáni.`);
    queryClient.invalidateQueries({ queryKey: ["splits", property?.id] });
  };

  return (
    <AppShell>
      <div className="flex items-center gap-2">
        <button onClick={() => navigate({ to: "/vydaje" })} aria-label="Zpět" className="grid size-11 place-items-center rounded-xl bg-secondary">
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="text-2xl font-bold">Vyrovnat dluhy</h1>
      </div>

      {le || ls ? (
        <LoadingCards />
      ) : suggestions.length === 0 ? (
        <EmptyState icon={HandCoins} title="Všechno je vyrovnané." hint="Nikdo nikomu nedluží." />
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
                  <p className="text-[13px] text-muted-foreground">dluží</p>
                </div>
                <p className="text-xl font-bold">{fmtKc(s.amount)}</p>
              </div>
              <button
                onClick={() => settle(s.from, s.to)}
                disabled={settling === `${s.from}->${s.to}`}
                className="btn-primary mt-3 w-full disabled:opacity-40"
              >
                {settling === `${s.from}->${s.to}` ? "Ukládám…" : "Označit jako vyrovnané"}
              </button>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}

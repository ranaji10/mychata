import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, ReceiptText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { EmptyState, LoadingCards, PageHeader, PillNeutral, PillWarn } from "@/components/bits";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/account";
import { EXPENSE_CATEGORY, fmtDate, fmtKc, type Expense } from "@/lib/data";

export const Route = createFileRoute("/vydaje")({
  head: () => ({
    meta: [
      { title: "Výdaje — My Chata" },
      { name: "description", content: "Sdílené výdaje za chatu a jejich rozdělení mezi členy." },
      { property: "og:title", content: "Výdaje — My Chata" },
      { property: "og:description", content: "Sdílené výdaje za chatu a jejich rozdělení mezi členy." },
    ],
  }),
  component: ExpensesPage,
});

const CATEGORY_KEYS = Object.keys(EXPENSE_CATEGORY) as (keyof typeof EXPENSE_CATEGORY)[];

function ExpensesPage() {
  const { property, currentMember, members } = useAccount();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORY_KEYS)[number]>("supplies");
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const { data: expenses, isLoading } = useQuery({
    queryKey: ["expenses", property?.id],
    enabled: !!property,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("property_id", property!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Expense[];
    },
  });

  const { data: splits } = useQuery({
    queryKey: ["splits", property?.id],
    enabled: !!property && !!expenses,
    queryFn: async () => {
      const ids = expenses!.map((e) => e.id);
      if (!ids.length) return [];
      const { data, error } = await supabase.from("expense_splits").select("*").in("expense_id", ids);
      if (error) throw error;
      return data as { expense_id: string; paid_back: boolean }[];
    },
  });

  const unsettledByExpense = new Set(
    (splits ?? []).filter((s) => !s.paid_back).map((s) => s.expense_id),
  );

  const payerName = (id: string | null) => members.find((m) => m.id === id)?.name ?? "—";

  const toggleMember = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const save = async () => {
    const amountCzk = Math.round(Number(amount.replace(",", ".")) * 100) / 100;
    if (!property || !currentMember || !desc.trim() || !amountCzk || selected.length === 0) return;
    setSaving(true);

    const { data: expense, error } = await supabase
      .from("expenses")
      .insert({
        property_id: property.id,
        paid_by_member_id: currentMember.id,
        amount: amountCzk,
        description: desc.trim(),
        category,
        split_method: "EQUAL",
        date: new Date().toISOString().slice(0, 10),
      })
      .select()
      .single();

    if (error || !expense) {
      setSaving(false);
      toast.error("Výdaj se nepodařilo uložit.");
      return;
    }

    const perPerson = Math.round((amountCzk / selected.length) * 100) / 100;
    const { error: splitError } = await supabase.from("expense_splits").insert(
      selected
        .filter((mid) => mid !== currentMember.id)
        .map((mid) => ({
          expense_id: expense.id,
          member_id: mid,
          amount_owed: perPerson,
          paid_back: false,
        })),
    );

    setSaving(false);
    if (splitError) {
      toast.error("Rozdělení se nepodařilo uložit.");
      return;
    }
    toast.success("Výdaj přidán a rozdělen.");
    setDesc("");
    setAmount("");
    setSelected([]);
    setShowForm(false);
    queryClient.invalidateQueries({ queryKey: ["expenses", property.id] });
    queryClient.invalidateQueries({ queryKey: ["splits", property.id] });
  };

  const total = expenses?.reduce((s, e) => s + Number(e.amount), 0) ?? 0;

  return (
    <AppShell>
      <PageHeader title="Výdaje" subtitle={`Celkem: ${fmtKc(total)}`} />

      <Link to="/vydaje/vyrovnani" className="btn-secondary mb-3 w-full">
        Vyrovnat dluhy
      </Link>

      {isLoading ? (
        <LoadingCards />
      ) : !expenses?.length ? (
        <EmptyState
          icon={ReceiptText}
          title="Zatím žádné výdaje."
          hint="Přidejte první výdaj a rozdělte ho mezi členy."
          action={
            <button onClick={() => setShowForm(true)} className="btn-primary w-full">Přidat výdaj</button>
          }
        />
      ) : (
        <div className="space-y-2.5">
          {expenses.map((e) => (
            <div key={e.id} className="card flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-bold">{e.description ?? EXPENSE_CATEGORY[e.category]}</p>
                <p className="text-[13px] text-muted-foreground">
                  {payerName(e.paid_by_member_id)} · {fmtDate(e.date ?? e.created_at)} · {EXPENSE_CATEGORY[e.category]}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[16px] font-bold">{fmtKc(Number(e.amount))}</p>
                {unsettledByExpense.has(e.id) ? (
                  <PillWarn>Nevyrovnané</PillWarn>
                ) : (
                  <PillNeutral>Vyrovnané</PillNeutral>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm ? (
        <section className="card mt-4 space-y-3 p-4">
          <h3 className="text-lg font-bold">Nový výdaj</h3>
          <div>
            <label htmlFor="exp-desc" className="mb-1 block text-[13px] font-bold">Popis</label>
            <input id="exp-desc" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Např. Dřevo na zimu" className="field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="exp-amount" className="mb-1 block text-[13px] font-bold">Částka (Kč)</label>
              <input id="exp-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className="field" />
            </div>
            <div>
              <label htmlFor="exp-cat" className="mb-1 block text-[13px] font-bold">Kategorie</label>
              <select id="exp-cat" value={category} onChange={(e) => setCategory(e.target.value as typeof category)} className="field">
                {CATEGORY_KEYS.map((c) => <option key={c} value={c}>{EXPENSE_CATEGORY[c]}</option>)}
              </select>
            </div>
          </div>
          <div>
            <span className="mb-1 block text-[13px] font-bold">Rozdělit mezi</span>
            <div className="flex flex-wrap gap-2">
              {members.map((m) => (
                <button
                  key={m.id}
                  onClick={() => toggleMember(m.id)}
                  className={`h-11 rounded-full px-4 text-[14px] font-bold ${
                    selected.includes(m.id) ? "bg-primary text-primary-foreground" : "bg-card ring-1 ring-black/10"
                  }`}
                >
                  {m.name.split(" ")[0]}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[12px] text-muted-foreground">Částka se rozdělí rovným dílem.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={saving || !desc.trim() || !amount || selected.length === 0}
              className="btn-primary flex-1 disabled:opacity-40"
            >
              {saving ? "Ukládám…" : "Přidat výdaj"}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-secondary">Zrušit</button>
          </div>
        </section>
      ) : (
        <button onClick={() => setShowForm(true)} className="btn-primary mt-4 w-full">
          <Plus className="size-5" /> Přidat výdaj
        </button>
      )}
    </AppShell>
  );
}

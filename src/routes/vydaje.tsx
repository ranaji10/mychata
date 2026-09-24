import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, ReceiptText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { EmptyState, LoadingCards, PageHeader, PillNeutral, PillWarn } from "@/components/bits";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/account";
import { EXPENSE_CATEGORY, expenseCategoryLabel, fmtDate, fmtKc, type Expense } from "@/lib/data";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/vydaje")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Expenses — My Chata" },
      { name: "description", content: "Shared cottage expenses and their split between members." },
      { property: "og:title", content: "Expenses — My Chata" },
      { property: "og:description", content: "Shared cottage expenses and their split between members." },
    ],
  }),
  component: ExpensesPage,
});

const CATEGORY_KEYS = Object.keys(EXPENSE_CATEGORY) as (keyof typeof EXPENSE_CATEGORY)[];

function ExpensesPage() {
  const { t, lang } = useLang();
  const { property, currentMember, members } = useAccount();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORY_KEYS)[number]>("supplies");
  const [selected, setSelected] = useState<string[]>([]);
  const [splitMethod, setSplitMethod] = useState<"EQUAL" | "CUSTOM" | "BY_BRANCH">("EQUAL");
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
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

    const selectedMembers = members.filter((member) => selected.includes(member.id));
    const branchNames = [...new Set(selectedMembers.map((member) => member.branch || member.name))];
    const shares = selectedMembers.map((member) => {
      if (splitMethod === "CUSTOM") return Number((customAmounts[member.id] ?? "0").replace(",", "."));
      if (splitMethod === "BY_BRANCH") {
        const branch = member.branch || member.name;
        const branchMembers = selectedMembers.filter((candidate) => (candidate.branch || candidate.name) === branch).length;
        return amountCzk / branchNames.length / branchMembers;
      }
      return amountCzk / selectedMembers.length;
    });
    const shareTotal = Math.round(shares.reduce((sum, share) => sum + share, 0) * 100) / 100;
    if (splitMethod === "CUSTOM" && Math.abs(shareTotal - amountCzk) > 0.01) {
      toast.error(t("Vlastní částky musí dát dohromady celkový výdaj.", "Custom amounts must add up to the total expense."));
      setSaving(false);
      return;
    }

    const { data: expense, error } = await supabase
      .from("expenses")
      .insert({
        property_id: property.id,
        paid_by_member_id: currentMember.id,
        amount: amountCzk,
        description: desc.trim(),
        category,
        split_method: splitMethod,
        date: new Date().toISOString().slice(0, 10),
      })
      .select()
      .single();

    if (error || !expense) {
      setSaving(false);
      toast.error(t("Výdaj se nepodařilo uložit.", "The expense could not be saved."));
      return;
    }

    const { error: splitError } = await supabase.from("expense_splits").insert(
      selectedMembers
        .map((member, index) => ({ member, amount: Math.round((shares[index] ?? 0) * 100) / 100 }))
        .filter(({ member }) => member.id !== currentMember.id)
        .map(({ member, amount: owed }) => ({
          expense_id: expense.id,
          member_id: member.id,
          amount_owed: owed,
          paid_back: false,
        })),
    );

    setSaving(false);
    if (splitError) {
      toast.error(t("Rozdělení se nepodařilo uložit.", "The split could not be saved."));
      return;
    }
    toast.success(t("Výdaj přidán a rozdělen.", "Expense added and split."));
    setDesc("");
    setAmount("");
    setSelected([]);
    setCustomAmounts({});
    setShowForm(false);
    queryClient.invalidateQueries({ queryKey: ["expenses", property.id] });
    queryClient.invalidateQueries({ queryKey: ["splits", property.id] });
  };

  const total = expenses?.reduce((s, e) => s + Number(e.amount), 0) ?? 0;

  return (
    <AppShell>
      <PageHeader title={t("Výdaje", "Expenses")} subtitle={`${t("Celkem", "Total")}: ${fmtKc(total)}`} />

      <Link to="/vydaje/vyrovnani" className="btn-secondary mb-3 w-full">
        {t("Vyrovnat dluhy", "Settle debts")}
      </Link>

      {isLoading ? (
        <LoadingCards />
      ) : !expenses?.length ? (
        <EmptyState
          icon={ReceiptText}
          title={t("Zatím žádné výdaje.", "No expenses yet.")}
          hint={t("Přidejte první výdaj a rozdělte ho mezi členy.", "Add the first expense and split it between members.")}
          action={
            <button onClick={() => setShowForm(true)} className="btn-primary w-full">{t("Přidat výdaj", "Add expense")}</button>
          }
        />
      ) : (
        <div className="space-y-2.5">
          {expenses.map((e) => (
            <div key={e.id} className="card flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-bold">{e.description ?? expenseCategoryLabel(e.category, lang)}</p>
                <p className="text-[13px] text-muted-foreground">
                  {payerName(e.paid_by_member_id)} · {fmtDate(e.date ?? e.created_at)} · {expenseCategoryLabel(e.category, lang)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[16px] font-bold">{fmtKc(Number(e.amount))}</p>
                {unsettledByExpense.has(e.id) ? (
                  <PillWarn>{t("Nevyrovnané", "Unsettled")}</PillWarn>
                ) : (
                  <PillNeutral>{t("Vyrovnané", "Settled")}</PillNeutral>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm ? (
        <section className="card mt-4 space-y-3 p-4">
          <h3 className="text-lg font-bold">{t("Nový výdaj", "New expense")}</h3>
          <div>
            <label htmlFor="exp-desc" className="mb-1 block text-[13px] font-bold">{t("Popis", "Description")}</label>
            <input id="exp-desc" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={t("Např. Dřevo na zimu", "E.g. Firewood for winter")} className="field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="exp-amount" className="mb-1 block text-[13px] font-bold">{t("Částka (Kč)", "Amount (Kč)")}</label>
              <input id="exp-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className="field" />
            </div>
            <div>
              <label htmlFor="exp-cat" className="mb-1 block text-[13px] font-bold">{t("Kategorie", "Category")}</label>
              <select id="exp-cat" value={category} onChange={(e) => setCategory(e.target.value as typeof category)} className="field">
                {CATEGORY_KEYS.map((c) => <option key={c} value={c}>{expenseCategoryLabel(c, lang)}</option>)}
              </select>
            </div>
          </div>
          <div>
            <span className="mb-1 block text-[13px] font-bold">{t("Způsob rozdělení", "Split method")}</span>
            <div className="grid grid-cols-3 gap-2">
              {([
                ["EQUAL", t("Rovným dílem", "Equal")],
                ["CUSTOM", t("Vlastní", "Custom")],
                ["BY_BRANCH", t("Podle větví", "By branch")],
              ] as const).map(([method, label]) => (
                <button key={method} onClick={() => setSplitMethod(method)} className={splitMethod === method ? "btn-primary px-2 text-[13px]" : "btn-secondary px-2 text-[13px]"}>{label}</button>
              ))}
            </div>
          </div>
          <div>
            <span className="mb-1 block text-[13px] font-bold">{t("Rozdělit mezi", "Split between")}</span>
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
            <p className="mt-1 text-[12px] text-muted-foreground">{t("Částka se rozdělí rovným dílem.", "The amount will be split equally.")}</p>
          </div>
          {splitMethod === "CUSTOM" && selected.length > 0 && (
            <div className="space-y-2">
              {members.filter((member) => selected.includes(member.id)).map((member) => (
                <label key={member.id} className="flex items-center gap-3 text-[14px] font-semibold">
                  <span className="min-w-0 flex-1 truncate">{member.name}</span>
                  <input
                    inputMode="decimal"
                    value={customAmounts[member.id] ?? ""}
                    onChange={(event) => setCustomAmounts((values) => ({ ...values, [member.id]: event.target.value }))}
                    className="field max-w-32"
                    aria-label={`${member.name} Kč`}
                    placeholder="0"
                  />
                </label>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={saving || !desc.trim() || !amount || selected.length === 0}
              className="btn-primary flex-1 disabled:opacity-40"
            >
              {saving ? t("Ukládám…", "Saving…") : t("Přidat výdaj", "Add expense")}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-secondary">{t("Zrušit", "Cancel")}</button>
          </div>
        </section>
      ) : (
        <button onClick={() => setShowForm(true)} className="btn-primary mt-4 w-full">
          <Plus className="size-5" /> {t("Přidat výdaj", "Add expense")}
        </button>
      )}
    </AppShell>
  );
}

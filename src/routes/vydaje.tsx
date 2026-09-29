import { createFileRoute, Link, Outlet, useChildMatches } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, ReceiptText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { EmptyState, LoadingCards, PageHeader, PillNeutral, PillWarn } from "@/components/bits";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/account";
import {
  EXPENSE_CATEGORY,
  equalShares,
  expenseCategoryLabel,
  expenseSettlement,
  fmtDate,
  fmtKc,
  parseAmount,
} from "@/lib/data";
import { expenseDataKey, useExpenseData } from "@/lib/expenses";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/vydaje")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Expenses — My Chata" },
      { name: "description", content: "Shared cottage expenses and their split between members." },
      { property: "og:title", content: "Expenses — My Chata" },
      {
        property: "og:description",
        content: "Shared cottage expenses and their split between members.",
      },
    ],
  }),
  component: ExpensesRoute,
});

const CATEGORY_KEYS = Object.keys(EXPENSE_CATEGORY) as (keyof typeof EXPENSE_CATEGORY)[];

// /vydaje/vyrovnani (Settle debts) is a child of this route in the file-based router, so
// it renders inside this component. Without an <Outlet /> the address changed but the list stayed on screen (T-022).
function ExpensesRoute() {
  const children = useChildMatches();
  return children.length ? <Outlet /> : <ExpensesPage />;
}

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

  const { data, isLoading } = useExpenseData(property?.id);
  const expenses = data?.expenses;
  const splits = data?.splits;

  const splitsOf = (expenseId: string) => (splits ?? []).filter((s) => s.expense_id === expenseId);

  const payerName = (id: string | null) => members.find((m) => m.id === id)?.name ?? "—";

  const amountCzk = parseAmount(amount);
  const selectedMembers = members.filter((member) => selected.includes(member.id));

  // Custom split: start from equal shares so people only adjust what differs.
  const prefillCustom = (ids: string[], total: number) => {
    if (!ids.length || !Number.isFinite(total) || total <= 0) return;
    const shares = equalShares(total, ids.length);
    setCustomAmounts(Object.fromEntries(ids.map((id, i) => [id, String(shares[i] ?? 0)])));
  };
  const toggleMember = (id: string) => {
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
    setSelected(next);
    if (splitMethod === "CUSTOM") prefillCustom(next, amountCzk);
  };
  const chooseMethod = (method: typeof splitMethod) => {
    setSplitMethod(method);
    if (method === "CUSTOM") prefillCustom(selected, amountCzk);
  };

  const shares = selectedMembers.map((member, index) => {
    if (splitMethod === "CUSTOM") return parseAmount(customAmounts[member.id] ?? "0");
    if (splitMethod === "BY_BRANCH") {
      const branchOf = (m: (typeof members)[number]) => m.branch || m.name;
      const branchNames = [...new Set(selectedMembers.map(branchOf))];
      const inBranch = selectedMembers.filter((m) => branchOf(m) === branchOf(member)).length;
      return Math.round((amountCzk / branchNames.length / inBranch) * 100) / 100;
    }
    return equalShares(amountCzk, selectedMembers.length)[index] ?? 0;
  });
  const assigned =
    Math.round(shares.reduce((sum, v) => sum + (Number.isFinite(v) ? v : 0), 0) * 100) / 100;
  const customInvalid =
    splitMethod === "CUSTOM" && shares.some((v) => !Number.isFinite(v) || v < 0);
  const remaining = Number.isFinite(amountCzk) ? Math.round((amountCzk - assigned) * 100) / 100 : 0;
  const customMismatch = splitMethod === "CUSTOM" && (customInvalid || Math.abs(remaining) > 0.01);

  const save = async () => {
    if (!property || !currentMember || !desc.trim() || selected.length === 0) return;
    if (!Number.isFinite(amountCzk) || amountCzk <= 0) {
      toast.error(
        t("Zadejte částku, např. 1 250 nebo 99,50.", "Enter an amount, e.g. 1250 or 99.50."),
      );
      return;
    }
    if (customMismatch) {
      toast.error(
        t(
          "Vlastní částky musí dát dohromady celkový výdaj.",
          "Custom amounts must add up to the total expense.",
        ),
      );
      return;
    }
    setSaving(true);
    try {
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
      if (error || !expense) throw error ?? new Error("expense_not_saved");

      // The payer doesn't owe themselves; everyone else owes their share.
      const splitRows = selectedMembers
        .map((member, index) => ({ member, owed: shares[index] ?? 0 }))
        .filter(({ member, owed }) => member.id !== currentMember.id && owed > 0)
        .map(({ member, owed }) => ({
          expense_id: expense.id,
          member_id: member.id,
          amount_owed: owed,
          paid_back: false,
        }));
      if (splitRows.length) {
        const { error: splitError } = await supabase.from("expense_splits").insert(splitRows);
        if (splitError) {
          // Don't leave an expense that looks unsplit: remove it and say so.
          const { error: undoError } = await supabase
            .from("expenses")
            .delete()
            .eq("id", expense.id);
          if (undoError) console.error("[vydaje] undo expense", undoError);
          throw splitError;
        }
      }
      await queryClient.invalidateQueries({ queryKey: expenseDataKey(property.id) });
      toast.success(
        splitRows.length
          ? t("Výdaj přidán a rozdělen.", "Expense added and split.")
          : t("Výdaj přidán, nerozdělen.", "Expense added, not split."),
      );
      setDesc("");
      setAmount("");
      setSelected([]);
      setCustomAmounts({});
      setSplitMethod("EQUAL");
      setShowForm(false);
    } catch (e) {
      console.error("[vydaje] save", e);
      const detail = (e as { message?: string } | null)?.message ?? String(e);
      toast.error(
        t(`Výdaj se nepodařilo uložit: ${detail}`, `The expense could not be saved: ${detail}`),
      );
    } finally {
      setSaving(false);
    }
  };

  const total = expenses?.reduce((s, e) => s + Number(e.amount), 0) ?? 0;

  return (
    <AppShell>
      <PageHeader
        title={t("Výdaje", "Expenses")}
        subtitle={`${t("Celkem", "Total")}: ${fmtKc(total)}`}
      />

      <Link to="/vydaje/vyrovnani" className="btn-secondary mb-3 w-full">
        {t("Vyrovnat dluhy", "Settle debts")}
      </Link>

      {isLoading ? (
        <LoadingCards />
      ) : !expenses?.length ? (
        <EmptyState
          icon={ReceiptText}
          title={t("Zatím žádné výdaje.", "No expenses yet.")}
          hint={t(
            "Přidejte první výdaj a rozdělte ho mezi členy.",
            "Add the first expense and split it between members.",
          )}
          action={
            <button onClick={() => setShowForm(true)} className="btn-primary w-full">
              {t("Přidat výdaj", "Add expense")}
            </button>
          }
        />
      ) : (
        <div className="space-y-2.5">
          {expenses.map((e) => (
            <div key={e.id} className="card flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-bold">
                  {e.description ?? expenseCategoryLabel(e.category, lang)}
                </p>
                <p className="text-[13px] text-muted-foreground">
                  {payerName(e.paid_by_member_id)} · {fmtDate(e.date ?? e.created_at)} ·{" "}
                  {expenseCategoryLabel(e.category, lang)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[16px] font-bold">{fmtKc(Number(e.amount))}</p>
                {splits &&
                  (() => {
                    const status = expenseSettlement(splitsOf(e.id));
                    if (status === "unsettled")
                      return <PillWarn>{t("Nevyrovnané", "Unsettled")}</PillWarn>;
                    if (status === "settled")
                      return <PillNeutral>{t("Vyrovnané", "Settled")}</PillNeutral>;
                    return (
                      <PillNeutral>
                        {e.paid_by_member_id === currentMember?.id
                          ? t("Zaplaceno vámi, nerozděleno", "Paid by you, not split")
                          : t("Nerozděleno", "Not split")}
                      </PillNeutral>
                    );
                  })()}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm ? (
        <section className="card mt-4 space-y-3 p-4">
          <h3 className="text-lg font-bold">{t("Nový výdaj", "New expense")}</h3>
          <div>
            <label htmlFor="exp-desc" className="mb-1 block text-[13px] font-bold">
              {t("Popis", "Description")}
            </label>
            <input
              id="exp-desc"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder={t("Např. Dřevo na zimu", "E.g. Firewood for winter")}
              className="field"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="exp-amount" className="mb-1 block text-[13px] font-bold">
                {t("Částka (Kč)", "Amount (Kč)")}
              </label>
              <input
                id="exp-amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  if (splitMethod === "CUSTOM")
                    prefillCustom(selected, parseAmount(e.target.value));
                }}
                placeholder="0"
                className="field"
              />
            </div>
            <div>
              <label htmlFor="exp-cat" className="mb-1 block text-[13px] font-bold">
                {t("Kategorie", "Category")}
              </label>
              <select
                id="exp-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value as typeof category)}
                className="field"
              >
                {CATEGORY_KEYS.map((c) => (
                  <option key={c} value={c}>
                    {expenseCategoryLabel(c, lang)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <span className="mb-1 block text-[13px] font-bold">
              {t("Způsob rozdělení", "Split method")}
            </span>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ["EQUAL", t("Rovným dílem", "Equal")],
                  ["CUSTOM", t("Vlastní", "Custom")],
                  ["BY_BRANCH", t("Podle větví", "By branch")],
                ] as const
              ).map(([method, label]) => (
                <button
                  key={method}
                  onClick={() => chooseMethod(method)}
                  className={
                    splitMethod === method
                      ? "btn-primary px-2 text-[13px]"
                      : "btn-secondary px-2 text-[13px]"
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="mb-1 block text-[13px] font-bold">
              {t("Rozdělit mezi", "Split between")}
            </span>
            <div className="flex flex-wrap gap-2">
              {members.map((m) => (
                <button
                  key={m.id}
                  onClick={() => toggleMember(m.id)}
                  className={`h-11 rounded-full px-4 text-[14px] font-bold ${
                    selected.includes(m.id)
                      ? "bg-primary text-primary-foreground"
                      : "bg-card ring-1 ring-black/10"
                  }`}
                >
                  {m.name.split(" ")[0]}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[12px] text-muted-foreground">
              {splitMethod === "EQUAL"
                ? t(
                    "Částka se rozdělí rovným dílem mezi vybrané (včetně vás, pokud jste vybráni).",
                    "The amount is split equally between the people chosen (including you, if chosen).",
                  )
                : splitMethod === "BY_BRANCH"
                  ? t(
                      "Každá větev rodiny platí stejně, uvnitř větve rovným dílem.",
                      "Each family branch pays the same; within a branch, equally.",
                    )
                  : t("Zadejte částku u každého.", "Enter an amount for each person.")}
            </p>
          </div>
          {splitMethod === "CUSTOM" && selected.length > 0 && (
            <div className="space-y-2">
              {members
                .filter((member) => selected.includes(member.id))
                .map((member) => (
                  <label
                    key={member.id}
                    className="flex items-center gap-3 text-[14px] font-semibold"
                  >
                    <span className="min-w-0 flex-1 truncate">{member.name}</span>
                    <input
                      inputMode="decimal"
                      value={customAmounts[member.id] ?? ""}
                      onChange={(event) =>
                        setCustomAmounts((values) => ({
                          ...values,
                          [member.id]: event.target.value,
                        }))
                      }
                      className="field max-w-32"
                      aria-label={`${member.name} Kč`}
                      placeholder="0"
                    />
                  </label>
                ))}
              <p
                className={`rounded-2xl p-3 text-[14px] font-semibold ${
                  customMismatch ? "bg-warn-soft text-warn" : "bg-ok-soft text-ok"
                }`}
                aria-live="polite"
              >
                {customInvalid
                  ? t("Zkontrolujte částky.", "Check the amounts.")
                  : Math.abs(remaining) <= 0.01
                    ? t("Rozděleno přesně.", "Split exactly.")
                    : remaining > 0
                      ? t(
                          `Zbývá rozdělit ${fmtKc(remaining)}.`,
                          `${fmtKc(remaining)} left to assign.`,
                        )
                      : t(
                          `O ${fmtKc(-remaining)} víc než výdaj.`,
                          `${fmtKc(-remaining)} more than the expense.`,
                        )}
              </p>
            </div>
          )}
          {splitMethod !== "CUSTOM" &&
            selectedMembers.length > 0 &&
            Number.isFinite(amountCzk) &&
            amountCzk > 0 && (
              <ul className="space-y-1 text-[14px]">
                {selectedMembers.map((member, index) => (
                  <li key={member.id} className="flex justify-between">
                    <span className="truncate">
                      {member.name}
                      {member.id === currentMember?.id
                        ? ` (${t("vy, platíte", "you, paying")})`
                        : ""}
                    </span>
                    <span className="font-semibold">{fmtKc(shares[index] ?? 0)}</span>
                  </li>
                ))}
              </ul>
            )}
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={
                saving || !desc.trim() || !amount || selected.length === 0 || customMismatch
              }
              className="btn-primary flex-1 disabled:opacity-40"
            >
              {saving ? t("Ukládám…", "Saving…") : t("Přidat výdaj", "Add expense")}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-secondary">
              {t("Zrušit", "Cancel")}
            </button>
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

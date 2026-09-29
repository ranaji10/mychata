import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Expense, ExpenseSplit } from "@/lib/data";

export const expenseDataKey = (propertyId: string | undefined) => ["expense-data", propertyId];

/**
 * Expenses and their splits, read together in one query (T-021).
 * They used to be two queries where the splits were read with the expense list of the
 * moment. After adding an expense the splits query could run with the old list, so the new
 * expense showed as "not split" and Settle debts showed nothing until the next refresh.
 */
export function useExpenseData(propertyId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: expenseDataKey(propertyId),
    enabled: !!propertyId && enabled,
    queryFn: async () => {
      const { data: expenses, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("property_id", propertyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const ids = (expenses ?? []).map((e) => e.id);
      if (!ids.length) return { expenses: [] as Expense[], splits: [] as ExpenseSplit[] };
      const { data: splits, error: splitError } = await supabase
        .from("expense_splits")
        .select("*")
        .in("expense_id", ids);
      if (splitError) throw splitError;
      return { expenses: expenses as Expense[], splits: splits as ExpenseSplit[] };
    },
  });
}

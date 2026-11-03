// "I paid" claims (T-057, migration 0040): a debtor says they paid someone, the payee confirms or
// says it didn't arrive. Members of the account can read the claims; only the functions write them.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PaymentClaim {
  id: string;
  property_id: string;
  from_member_id: string;
  to_member_id: string;
  expense_id: string | null;
  amount: number;
  status: "PENDING" | "CONFIRMED" | "REJECTED";
  created_at: string;
  decided_at: string | null;
}

export const paymentClaimsKey = (propertyId: string | undefined) =>
  ["payment-claims", propertyId] as const;

/** Open claims at this cottage. Empty before migration 0040 is applied. */
export function usePaymentClaims(propertyId: string | undefined) {
  return useQuery({
    queryKey: paymentClaimsKey(propertyId),
    enabled: !!propertyId,
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_claims")
        .select(
          "id, property_id, from_member_id, to_member_id, expense_id, amount, status, created_at, decided_at",
        )
        .eq("property_id", propertyId!)
        .eq("status", "PENDING")
        .order("created_at");
      if (error) {
        if (/payment_claims|PGRST205|42P01/.test(`${error.code} ${error.message}`)) return [];
        throw error;
      }
      return (data ?? []).map((c) => ({ ...c, amount: Number(c.amount) })) as PaymentClaim[];
    },
  });
}

/** The open claim between two people (whole debt) or for one expense, if any. */
export function openClaim(
  claims: PaymentClaim[] | undefined,
  from: string,
  to: string,
  expenseId: string | null = null,
): PaymentClaim | undefined {
  return (claims ?? []).find(
    (c) =>
      c.status === "PENDING" &&
      c.from_member_id === from &&
      c.to_member_id === to &&
      // Settle debts asks about the whole debt; the expense sheet about one share (or a whole-debt
      // claim, which covers it too).
      (expenseId === null
        ? c.expense_id === null
        : c.expense_id === expenseId || c.expense_id === null),
  );
}

// Ownership hand-over and leaving an account (25 Oct 2026, T-045). The database decides
// (offer/respond/cancel_account_ownership, leave_account in migration 0036); these hooks read
// the open offers and word the database's refusals.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isMissingFunction } from "@/lib/my-cottages";

export interface OwnershipOfferToMe {
  id: string;
  account_id: string;
  account_name: string;
  from_name: string;
  created_at: string;
}

export const myOffersKey = (userId: string | undefined) => ["ownership-offers-to-me", userId];
export const accountOfferKey = (accountId: string | undefined) => [
  "ownership-offer-open",
  accountId,
];

/** Offers waiting for me to accept, in any of my accounts. */
export function useMyOwnershipOffers(userId: string | undefined) {
  return useQuery({
    queryKey: myOffersKey(userId),
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("my_ownership_offers");
      if (error) {
        // Before migration 0036 is applied the function doesn't exist: nothing to show.
        if (isMissingFunction(error)) return [] as OwnershipOfferToMe[];
        throw error;
      }
      return (data ?? []) as OwnershipOfferToMe[];
    },
  });
}

/** The owner's open offer in this account, if any (admins can read it). */
export function useOpenOwnershipOffer(accountId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: accountOfferKey(accountId),
    enabled: !!accountId && enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ownership_offers")
        .select("id, to_member_id, created_at")
        .eq("account_id", accountId!)
        .eq("status", "PENDING")
        .maybeSingle();
      if (error) {
        // Before 0036 the table doesn't exist (PGRST205 / 42P01): no offer.
        if (error.code === "PGRST205" || error.code === "42P01") return null;
        throw error;
      }
      return data;
    },
  });
}

type T = (cs: string, en: string) => string;

export function ownershipError(message: string, t: T): string {
  if (message.includes("owner_must_transfer"))
    return t(
      "Vlastník nemůže odejít. Nejdřív předejte vlastnictví a počkejte, až ho druhý přijme.",
      "The owner can't leave. Hand over ownership first and wait until it is accepted.",
    );
  if (message.includes("open_debts"))
    return t(
      "Nejdřív vyrovnejte dluhy ve Výdajích (co dlužíte i co dluží vám).",
      "Settle your debts in Expenses first (what you owe and what you're owed).",
    );
  if (message.includes("member_has_no_sign_in"))
    return t("Tento člen se ještě nepřihlásil.", "This member has not signed in yet.");
  if (message.includes("owner_required"))
    return t("To může jen vlastník účtu.", "Only the account's owner can do that.");
  if (message.includes("not_your_offer"))
    return t("Tato nabídka není pro vás.", "This offer isn't for you.");
  if (message.includes("offer_closed") || message.includes("offer_not_found"))
    return t(
      "Nabídka už neplatí (vlastník ji zrušil nebo se změnil).",
      "The offer is no longer open (the owner cancelled it or changed).",
    );
  return t(`Akce se nepodařila: ${message}`, `That didn't work: ${message}`);
}

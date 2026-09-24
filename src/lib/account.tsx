import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Account, Member, Property } from "@/lib/data";

interface AccountState {
  account: Account | null;
  property: Property | null;
  members: Member[];
  loading: boolean;
  /** The member record securely linked to the signed-in user. */
  currentMember: Member | null;
  currentMemberId: string | null;
  user: User | null;
}

const AccountContext = createContext<AccountState | null>(null);

export function AccountProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { setUser(data.user); setAuthLoading(false); });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => { setUser(session?.user ?? null); setAuthLoading(false); });
    return () => data.subscription.unsubscribe();
  }, []);

  const { data: identityMember, isLoading: loadingIdentity } = useQuery({
    queryKey: ["identity-member", user?.id], enabled: !!user,
    queryFn: async () => {
      await supabase.rpc("claim_initial_membership");
      const { data, error } = await supabase.from("members").select("*").eq("user_id", user?.id ?? "").single();
      if (error) throw error;
      return data as Member;
    },
  });
  const { data: accounts, isLoading: loadingAccounts } = useQuery({
    queryKey: ["accounts", user?.id],
    enabled: !!identityMember,
    queryFn: async () => {
      const { data, error } = await supabase.from("accounts").select("*").order("created_at");
      if (error) throw error;
      return data as Account[];
    },
  });

  const account = useMemo(
    () => accounts?.find((a) => a.id === identityMember?.account_id) ?? null,
    [accounts, identityMember?.account_id],
  );

  const { data: property, isLoading: loadingProperty } = useQuery({
    queryKey: ["property", account?.id],
    enabled: !!account,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("account_id", account!.id)
        .limit(1)
        .single();
      if (error) throw error;
      return data as Property;
    },
  });

  const { data: members, isLoading: loadingMembers } = useQuery({
    queryKey: ["members", account?.id],
    enabled: !!account,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("*")
        .eq("account_id", account!.id)
        .order("created_at");
      if (error) throw error;
      return data as Member[];
    },
  });

  const value: AccountState = {
    account,
    property: property ?? null,
    members: members ?? [],
    loading: authLoading || (!!user && loadingIdentity) || loadingAccounts || (!!account && (loadingProperty || loadingMembers)),
    currentMember: identityMember ?? null,
    currentMemberId: identityMember?.id ?? null,
    user,
  };

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount(): AccountState {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error("useAccount must be used inside AccountProvider");
  return ctx;
}

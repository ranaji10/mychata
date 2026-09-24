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
  selectAccount: (id: string | null) => void;
  /** The "current user" for this demo build — defaults to the first ADMIN/OWNER member. */
  currentMember: Member | null;
  currentMemberId: string | null;
  setCurrentMemberId: (id: string) => void;
  user: User | null;
}

const AccountContext = createContext<AccountState | null>(null);

const LS_KEY = "mychata.account";
const LS_MEMBER = "mychata.member";

export function AccountProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [accountId, setAccountId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(LS_KEY);
    } catch {
      return null;
    }
  });

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
  const [memberId, setMemberId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(LS_MEMBER);
    } catch {
      return null;
    }
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
    () => accounts?.find((a) => a.id === accountId) ?? null,
    [accounts, accountId],
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

  const currentMember = useMemo((): Member | null => {
    if (!members?.length) return null;
    const found = members.find((m) => m.id === memberId);
    if (found) return found;
    return members.find((m) => m.role === "ADMIN") ?? members[0] ?? null;
  }, [members, memberId]);

  // Auto-select first account if none chosen yet
  useEffect(() => {
    if (identityMember && accountId !== identityMember.account_id) setAccountId(identityMember.account_id);
  }, [identityMember, accountId]);

  useEffect(() => {
    const first = accounts?.[0];
    if (!identityMember && !accountId && first) {
      setAccountId(first.id);
    }
  }, [accounts, accountId, identityMember]);

  const value: AccountState = {
    account,
    property: property ?? null,
    members: members ?? [],
    loading: authLoading || (!!user && loadingIdentity) || loadingAccounts || (!!account && (loadingProperty || loadingMembers)),
    selectAccount: (id) => {
      setAccountId(id);
      setMemberId(null);
      try {
        if (id) localStorage.setItem(LS_KEY, id);
        else localStorage.removeItem(LS_KEY);
        localStorage.removeItem(LS_MEMBER);
      } catch {
        /* ignore */
      }
    },
    currentMember: identityMember ?? currentMember,
    currentMemberId: currentMember?.id ?? null,
    setCurrentMemberId: (id) => {
      setMemberId(id);
      try {
        localStorage.setItem(LS_MEMBER, id);
      } catch {
        /* ignore */
      }
    },
    user,
  };

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount(): AccountState {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error("useAccount must be used inside AccountProvider");
  return ctx;
}

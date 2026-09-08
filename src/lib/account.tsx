import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
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
}

const AccountContext = createContext<AccountState | null>(null);

const LS_KEY = "mychata.account";
const LS_MEMBER = "mychata.member";

export function AccountProvider({ children }: { children: ReactNode }) {
  const [accountId, setAccountId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(LS_KEY);
    } catch {
      return null;
    }
  });
  const [memberId, setMemberId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(LS_MEMBER);
    } catch {
      return null;
    }
  });

  const { data: accounts, isLoading: loadingAccounts } = useQuery({
    queryKey: ["accounts"],
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

  const currentMember = useMemo(() => {
    if (!members?.length) return null;
    const found = members.find((m) => m.id === memberId);
    if (found) return found;
    return members.find((m) => m.role === "ADMIN") ?? members[0];
  }, [members, memberId]);

  // Auto-select first account if none chosen yet
  useEffect(() => {
    if (!accountId && accounts?.length) {
      setAccountId(accounts[0].id);
    }
  }, [accounts, accountId]);

  const value: AccountState = {
    account,
    property: property ?? null,
    members: members ?? [],
    loading: loadingAccounts || (!!account && (loadingProperty || loadingMembers)),
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
    currentMember,
    currentMemberId: currentMember?.id ?? null,
    setCurrentMemberId: (id) => {
      setMemberId(id);
      try {
        localStorage.setItem(LS_MEMBER, id);
      } catch {
        /* ignore */
      }
    },
  };

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount(): AccountState {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error("useAccount must be used inside AccountProvider");
  return ctx;
}

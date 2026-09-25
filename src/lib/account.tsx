import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Account, Member, Profile, Property } from "@/lib/data";

const LS_PROPERTY = "mychata.property";

interface AccountState {
  account: Account | null;
  /** Every account this person belongs to (family chata, in-laws' chata, an institution…). */
  accounts: Account[];
  /** Makes another account active. Row-level security follows the active account. */
  switchAccount: (accountId: string) => Promise<void>;
  property: Property | null;
  properties: Property[];
  setActivePropertyId: (id: string) => void;
  members: Member[];
  loading: boolean;
  /** The member record securely linked to the signed-in user (null = not linked yet). */
  currentMember: Member | null;
  currentMemberId: string | null;
  profile: Profile | null;
  /** True when the signed-in user must complete onboarding before using the app. */
  needsOnboarding: boolean;
  user: User | null;
}

const AccountContext = createContext<AccountState | null>(null);

export function AccountProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activePropertyId, setActivePropertyIdState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(LS_PROPERTY);
    } catch {
      return null;
    }
  });
  const queryClient = useQueryClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setAuthLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // All member rows for this person, one per account (migration 0011).
  const { data: memberships, isLoading: loadingIdentity } = useQuery({
    queryKey: ["identity-members", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { error: claimError } = await supabase.rpc("claim_initial_membership");
      if (claimError) console.error("[account] claim_initial_membership", claimError.message);
      const { data, error } = await supabase
        .from("members")
        .select("*")
        .eq("user_id", user?.id ?? "")
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as Member[];
    },
  });

  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user?.id ?? "")
        .maybeSingle();
      if (error) throw error;
      return (data as Profile | null) ?? null;
    },
  });

  // Same rule as the database's current_account_id(): the saved active account if the
  // person still belongs to it, otherwise their oldest membership.
  const identityMember = useMemo(() => {
    if (!memberships?.length) return null;
    return memberships.find((m) => m.account_id === profile?.active_account_id) ?? memberships[0]!;
  }, [memberships, profile?.active_account_id]);

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

  const switchAccount = async (accountId: string) => {
    const { error } = await supabase.rpc("set_active_account", { _account_id: accountId });
    if (error) throw error;
    setActivePropertyIdState(null);
    try {
      localStorage.removeItem(LS_PROPERTY);
    } catch {
      /* ignore */
    }
    await queryClient.invalidateQueries();
  };

  const { data: properties, isLoading: loadingProperties } = useQuery({
    queryKey: ["properties", account?.id],
    enabled: !!account,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("account_id", account!.id)
        .order("created_at");
      if (error) throw error;
      return data as Property[];
    },
  });

  const property = useMemo(() => {
    if (!properties?.length) return null;
    return properties.find((p) => p.id === activePropertyId) ?? properties[0]!;
  }, [properties, activePropertyId]);

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

  const setActivePropertyId = (id: string) => {
    setActivePropertyIdState(id);
    try {
      localStorage.setItem(LS_PROPERTY, id);
    } catch {
      /* ignore */
    }
    queryClient.invalidateQueries();
  };

  // Onboarding is required until the profile is marked complete (invite acceptance marks it complete).
  const needsOnboarding =
    !!user && !loadingIdentity && !loadingProfile && !profile?.onboarding_completed_at;

  const value: AccountState = {
    account,
    accounts: accounts ?? [],
    switchAccount,
    property,
    properties: properties ?? [],
    setActivePropertyId,
    members: members ?? [],
    loading:
      authLoading ||
      (!!user && (loadingIdentity || loadingProfile)) ||
      (!!identityMember && loadingAccounts) ||
      (!!account && (loadingProperties || loadingMembers)),
    currentMember: identityMember ?? null,
    currentMemberId: identityMember?.id ?? null,
    profile: profile ?? null,
    needsOnboarding,
    user,
  };

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount(): AccountState {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error("useAccount must be used inside AccountProvider");
  return ctx;
}

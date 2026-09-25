import { createFileRoute } from "@tanstack/react-router";
import { Copy, Crown, ShieldCheck, UserMinus, UserPlus } from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/bits";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/account";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/clenove")({
  staticData: { sitemap: false },
  head: () => ({ meta: [{ title: "Members — My Chata" }, { name: "robots", content: "noindex" }] }),
  component: MembersPage,
});

interface Invitation {
  id: string;
  email: string | null;
  role: string;
  token: string;
  status: string;
  created_at: string;
}

function MembersPage() {
  const { t } = useLang();
  const { account, property, members, currentMember } = useAccount();
  const queryClient = useQueryClient();
  const isAdmin = currentMember?.role === "ADMIN" || currentMember?.role === "OWNER";
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");

  const { data: invites } = useQuery({
    queryKey: ["invitations", account?.id],
    enabled: !!account && isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invitations")
        .select("*")
        .eq("account_id", account!.id)
        .eq("status", "PENDING")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Invitation[];
    },
  });

  const { data: propertyAdmins } = useQuery({
    queryKey: ["property-admins", property?.id],
    enabled: !!property,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_admins")
        .select("member_id")
        .eq("property_id", property!.id);
      if (error) throw error;
      return new Set((data as { member_id: string }[]).map((r) => r.member_id));
    },
  });

  const invite = useMutation({
    mutationFn: async () => {
      const token = crypto.randomUUID();
      const { error } = await supabase.from("invitations").insert({
        account_id: account!.id,
        property_id: property?.id ?? null,
        email: email.trim().toLowerCase(),
        role: inviteRole,
        token,
        created_by_member_id: currentMember?.id ?? null,
      });
      if (error) throw error;
      return token;
    },
    onSuccess: async (token) => {
      setEmail("");
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
      const link = `${window.location.origin}/pozvanka/${token}`;
      try {
        await navigator.clipboard.writeText(link);
        toast.success(
          t("Pozvánka vytvořena a odkaz zkopírován.", "Invitation created and link copied."),
        );
      } catch {
        toast.success(t("Pozvánka vytvořena.", "Invitation created."));
      }
    },
    onError: () =>
      toast.error(t("Pozvánku se nepodařilo vytvořit.", "Could not create the invitation.")),
  });

  const toggleRole = useMutation({
    // One server-side function decides (migration 0011): checks the caller is an admin of
    // this account and refuses to remove the last admin.
    mutationFn: async ({ memberId, makeAdmin }: { memberId: string; makeAdmin: boolean }) => {
      const { error } = await supabase.rpc("set_member_role", {
        _member_id: memberId,
        _role: makeAdmin ? "ADMIN" : "MEMBER",
      });
      if (error) {
        if (error.message.includes("last_admin")) throw new Error("last-admin");
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      toast.success(t("Oprávnění změněna.", "Permissions updated."));
    },
    onError: (e) =>
      toast.error(
        e.message === "last-admin"
          ? t("Musí zbýt alespoň jeden správce.", "At least one admin must remain.")
          : e.message === "not-registered"
            ? t("Tento člen se ještě nepřihlásil.", "This member has not signed in yet.")
            : t("Změna se nepodařila.", "Change failed."),
      ),
  });

  const copyInvite = async (token: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/pozvanka/${token}`);
      toast.success(t("Odkaz zkopírován.", "Link copied."));
    } catch {
      /* ignore */
    }
  };

  return (
    <AppShell>
      <PageHeader
        title={t("Členové a oprávnění", "Members & permissions")}
        subtitle={account?.name ?? ""}
      />

      {isAdmin && (
        <div className="card mt-4 space-y-3 p-4">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <UserPlus className="size-5 text-primary" />
            {t("Pozvat nového člena", "Invite a new member")}
          </h2>
          <input
            className="field w-full"
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              className={`btn-secondary ${inviteRole === "member" ? "ring-2 ring-primary" : ""}`}
              onClick={() => setInviteRole("member")}
            >
              {t("Člen", "Member")}
            </button>
            <button
              className={`btn-secondary ${inviteRole === "admin" ? "ring-2 ring-primary" : ""}`}
              onClick={() => setInviteRole("admin")}
            >
              {t("Správce", "Admin")}
            </button>
          </div>
          <button
            className="btn-primary w-full"
            disabled={!email.includes("@") || invite.isPending}
            onClick={() => invite.mutate()}
          >
            {t("Vytvořit pozvánku", "Create invitation")}
          </button>
          {!!invites?.length && (
            <div className="space-y-2">
              <p className="text-[14px] font-bold text-muted-foreground">
                {t("Čekající pozvánky", "Pending invitations")}
              </p>
              {invites.map((inv) => (
                <div key={inv.id} className="flex items-center gap-2 rounded-2xl bg-secondary p-3">
                  <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">
                    {inv.email}
                  </span>
                  <span className="pill bg-card text-muted-foreground">
                    {inv.role === "admin" ? t("Správce", "Admin") : t("Člen", "Member")}
                  </span>
                  <button
                    className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary"
                    aria-label={t("Zkopírovat odkaz", "Copy link")}
                    onClick={() => copyInvite(inv.token)}
                  >
                    <Copy className="size-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-4 space-y-2">
        {members.map((m) => {
          const mIsAdmin = m.role === "ADMIN" || m.role === "OWNER";
          const isPropAdmin = propertyAdmins?.has(m.id);
          return (
            <div key={m.id} className="card flex items-center gap-3 p-4">
              <div className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary font-bold text-muted-foreground">
                {m.name.slice(0, 1)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{m.name}</p>
                <p className="truncate text-[14px] text-muted-foreground">{m.email}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {mIsAdmin && (
                    <span className="pill bg-primary-soft text-primary">
                      <ShieldCheck className="size-3.5" /> {t("Správce", "Admin")}
                    </span>
                  )}
                  {isPropAdmin && (
                    <span className="pill bg-ok-soft text-ok">
                      <Crown className="size-3.5" />{" "}
                      {t("Správce této chaty", "Admin of this cottage")}
                    </span>
                  )}
                  {!m.user_id && (
                    <span className="pill bg-warn-soft text-warn">
                      {t("Zatím nepřihlášen", "Not signed in yet")}
                    </span>
                  )}
                </div>
              </div>
              {isAdmin && m.id !== currentMember?.id && m.user_id && (
                <button
                  className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary"
                  aria-label={
                    mIsAdmin
                      ? t("Odebrat správce", "Remove admin")
                      : t("Udělat správcem", "Make admin")
                  }
                  onClick={() => toggleRole.mutate({ memberId: m.id, makeAdmin: !mIsAdmin })}
                >
                  {mIsAdmin ? <UserMinus className="size-5" /> : <ShieldCheck className="size-5" />}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}

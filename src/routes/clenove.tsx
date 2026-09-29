import { createFileRoute } from "@tanstack/react-router";
import { Copy, Crown, Loader2, Mail, Share2, ShieldCheck, UserMinus, UserPlus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/bits";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/account";
import { useLang } from "@/lib/i18n";
import { inviteLink, inviteMailto, parseEmails } from "@/lib/invites";

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
  const [emails, setEmails] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const parsed = parseEmails(emails);
  const isAdminRole = (role: string) =>
    role.toUpperCase() === "ADMIN" || role.toUpperCase() === "OWNER";

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

  // Stored as a plain array: the offline cache saves query results as JSON, and a Set came
  // back as {} after a reload, which crashed this page ("I.has is not a function").
  const { data: propertyAdminIds } = useQuery({
    queryKey: ["property-admins", property?.id],
    enabled: !!property,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_admins")
        .select("member_id")
        .eq("property_id", property!.id);
      if (error) throw error;
      return (data as { member_id: string }[]).map((r) => r.member_id);
    },
  });
  const propertyAdmins = useMemo(
    () => new Set(Array.isArray(propertyAdminIds) ? propertyAdminIds : []),
    [propertyAdminIds],
  );

  // Several people at once, each with their own link. Roles are stored upper case; the
  // database also normalises them (migration 0020), which fixes admin invitations (B-011).
  const invite = useMutation({
    mutationFn: async () => {
      const rows = parsed.valid.map((address) => ({
        account_id: account!.id,
        property_id: property?.id ?? null,
        email: address,
        role: inviteRole,
        token: crypto.randomUUID(),
        created_by_member_id: currentMember?.id ?? null,
      }));
      const { error } = await supabase.from("invitations").insert(rows);
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (count) => {
      setEmails("");
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
      toast.success(
        t(
          `Pozvánky vytvořeny (${count}). Pošlete je e-mailem nebo sdílejte odkaz níže.`,
          `Invitations created (${count}). Email them or share the link below.`,
        ),
      );
    },
    onError: (error) => {
      console.error("[clenove] invite", error);
      toast.error(
        t(
          `Pozvánky se nepodařilo vytvořit: ${error.message}`,
          `Could not create the invitations: ${error.message}`,
        ),
      );
    },
  });

  const updateInvite = useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: { role?: string; status?: string };
    }) => {
      const { error } = await supabase.from("invitations").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invitations"] }),
    onError: (error) =>
      toast.error(t(`Změna se nepodařila: ${error.message}`, `Change failed: ${error.message}`)),
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
    onSuccess: async () => {
      // Removing admin rights also removes "Admin of this cottage" in the database, so both
      // lists are re-read before the page shows the new state.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["members"] }),
        queryClient.invalidateQueries({ queryKey: ["property-admins"] }),
        queryClient.invalidateQueries({ queryKey: ["identity-members"] }),
      ]);
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

  const linkFor = (token: string) => inviteLink(window.location.origin, token);

  const copyInvite = async (token: string) => {
    try {
      await navigator.clipboard.writeText(linkFor(token));
      toast.success(t("Odkaz zkopírován.", "Link copied."));
    } catch {
      toast.error(t("Odkaz se nepodařilo zkopírovat.", "Could not copy the link."));
    }
  };

  const shareInvite = async (inv: Invitation) => {
    const url = linkFor(inv.token);
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: t("Pozvánka do chaty", "Invitation to a cottage"),
          text: t(
            `Pozvánka do chaty ${account?.name ?? ""}`,
            `Invitation to ${account?.name ?? "our cottage"}`,
          ),
          url,
        });
        return;
      } catch {
        /* cancelled: fall back to copying */
      }
    }
    await copyInvite(inv.token);
  };

  const mailInvite = (inv: Invitation) =>
    inviteMailto({
      to: inv.email ?? "",
      link: linkFor(inv.token),
      chata: property?.name ?? account?.name ?? "My Chata",
      inviter: currentMember?.name,
      admin: isAdminRole(inv.role),
    });

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
          <label className="block">
            <span className="text-[14px] font-bold">
              {t("E-maily (jeden nebo více)", "Emails (one or more)")}
            </span>
            <textarea
              className="field mt-1 min-h-[88px] w-full"
              placeholder={t("jana@email.cz, petr@email.cz", "jana@email.cz, petr@email.cz")}
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              autoComplete="email"
            />
          </label>
          {parsed.invalid.length > 0 && (
            <p className="text-[14px] font-semibold text-warn">
              {t(
                `Zkontrolujte: ${parsed.invalid.join(", ")}`,
                `Please check: ${parsed.invalid.join(", ")}`,
              )}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button
              className={`btn-secondary ${inviteRole === "MEMBER" ? "ring-2 ring-primary" : ""}`}
              onClick={() => setInviteRole("MEMBER")}
            >
              {t("Člen", "Member")}
            </button>
            <button
              className={`btn-secondary ${inviteRole === "ADMIN" ? "ring-2 ring-primary" : ""}`}
              onClick={() => setInviteRole("ADMIN")}
            >
              {t("Správce", "Admin")}
            </button>
          </div>
          <button
            className="btn-primary w-full"
            disabled={parsed.valid.length === 0 || parsed.invalid.length > 0 || invite.isPending}
            onClick={() => invite.mutate()}
          >
            {parsed.valid.length > 1
              ? t(
                  `Vytvořit ${parsed.valid.length} pozvánky`,
                  `Create ${parsed.valid.length} invitations`,
                )
              : t("Vytvořit pozvánku", "Create invitation")}
          </button>
          <p className="text-[13px] text-muted-foreground">
            {t(
              "Každý dostane vlastní odkaz, platný 7 dní, jen pro svůj e-mail. Roli můžete změnit i později.",
              "Everyone gets their own link, valid 7 days, for their email only. You can change the role later.",
            )}
          </p>
          {!!invites?.length && (
            <div className="space-y-2">
              <p className="text-[14px] font-bold text-muted-foreground">
                {t("Čekající pozvánky", "Pending invitations")}
              </p>
              {invites.map((inv) => (
                <div key={inv.id} className="space-y-2 rounded-2xl bg-secondary p-3">
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">
                      {inv.email ?? t("kdokoli s odkazem", "anyone with the link")}
                    </span>
                    <button
                      className="pill bg-card text-muted-foreground"
                      aria-label={t("Změnit roli", "Change role")}
                      onClick={() =>
                        updateInvite.mutate({
                          id: inv.id,
                          patch: { role: isAdminRole(inv.role) ? "MEMBER" : "ADMIN" },
                        })
                      }
                    >
                      {isAdminRole(inv.role) ? t("Správce", "Admin") : t("Člen", "Member")} ⇄
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {inv.email && (
                      <a
                        className="grid h-11 place-items-center rounded-xl bg-card"
                        href={mailInvite(inv)}
                        aria-label={t("Poslat e-mailem", "Send by email")}
                      >
                        <Mail className="size-5" />
                      </a>
                    )}
                    <button
                      className="grid h-11 place-items-center rounded-xl bg-card"
                      aria-label={t("Sdílet", "Share")}
                      onClick={() => shareInvite(inv)}
                    >
                      <Share2 className="size-5" />
                    </button>
                    <button
                      className="grid h-11 place-items-center rounded-xl bg-card"
                      aria-label={t("Zkopírovat odkaz", "Copy link")}
                      onClick={() => copyInvite(inv.token)}
                    >
                      <Copy className="size-5" />
                    </button>
                    <button
                      className="grid h-11 place-items-center rounded-xl bg-card text-muted-foreground"
                      aria-label={t("Zrušit pozvánku", "Cancel invitation")}
                      onClick={() =>
                        updateInvite.mutate({ id: inv.id, patch: { status: "REVOKED" } })
                      }
                    >
                      <X className="size-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-4 space-y-2">
        {members.map((m) => {
          const mIsAdmin = m.role === "ADMIN" || m.role === "OWNER";
          // Only a current admin can be "admin of this cottage" (a stale row must not show).
          const isPropAdmin = mIsAdmin && propertyAdmins.has(m.id);
          const changing = toggleRole.isPending && toggleRole.variables?.memberId === m.id;
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
                  className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary disabled:opacity-50"
                  disabled={toggleRole.isPending}
                  aria-busy={changing}
                  aria-label={
                    mIsAdmin
                      ? t("Odebrat správce", "Remove admin")
                      : t("Udělat správcem", "Make admin")
                  }
                  onClick={() => toggleRole.mutate({ memberId: m.id, makeAdmin: !mIsAdmin })}
                >
                  {changing ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : mIsAdmin ? (
                    <UserMinus className="size-5" />
                  ) : (
                    <ShieldCheck className="size-5" />
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}

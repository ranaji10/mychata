import { Button } from "@/components/ui/button";
import { ManualCopyLink } from "@/components/ManualCopyLink";
import { createFileRoute } from "@tanstack/react-router";
import {
  ChevronDown,
  Copy,
  Crown,
  Loader2,
  Mail,
  RefreshCw,
  Share2,
  ShieldCheck,
  UserMinus,
  UserPlus,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/bits";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/account";
import { accountContextLine } from "@/lib/account-label";
import { useLang } from "@/lib/i18n";
import { fmtDate } from "@/lib/data";
import {
  daysUntil,
  groupInvitations,
  inviteLink,
  inviteMailto,
  parseEmails,
  type InvitationBatch,
  type InvitationRow,
} from "@/lib/invites";

export const Route = createFileRoute("/clenove")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Members — My Chata" },
      { name: "robots", content: "noindex" },
      { name: "description", content: "Members and invitations for your shared cottage." },
      { property: "og:title", content: "Members — My Chata" },
      { property: "og:description", content: "Members and invitations for your shared cottage." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MembersPage,
});

type Invitation = InvitationRow;

function MembersPage() {
  const { t } = useLang();
  const [manualLink, setManualLink] = useState<{ token: string; url: string } | null>(null);
  const { account, property, members, currentMember } = useAccount();
  const queryClient = useQueryClient();
  const isAdmin = currentMember?.role === "ADMIN" || currentMember?.role === "OWNER";
  const [emails, setEmails] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [cancelling, setCancelling] = useState<InvitationBatch | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const parsed = parseEmails(emails);
  const isAdminRole = (role: string) =>
    role.toUpperCase() === "ADMIN" || role.toUpperCase() === "OWNER";

  // Every batch, not only pending rows: a tile says who already joined (bug 11).
  const { data: invites } = useQuery({
    queryKey: ["invitations", account?.id, "batches"],
    enabled: !!account && isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invitations")
        .select("*")
        .eq("account_id", account!.id)
        .in("status", ["PENDING", "ACCEPTED"])
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data as Invitation[];
    },
  });
  const batches = useMemo(() => groupInvitations(invites ?? []), [invites]);
  const activeBatches = batches.filter((b) => b.state === "active");
  const expiredBatches = batches.filter((b) => b.state === "expired");

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

  // Several people at once with ONE link (bugs 10 and 12): every row keeps its own token and
  // shares the batch's group_token; the database lets only the listed emails use it
  // (migration 0026). Roles are stored upper case (migration 0020, B-011).
  const createBatch = async (
    addresses: string[],
    role: string,
    propertyId: string | null = property?.id ?? null,
  ) => {
    const groupToken = crypto.randomUUID();
    const rows = addresses.map((address) => ({
      account_id: account!.id,
      property_id: propertyId,
      email: address,
      role,
      token: crypto.randomUUID(),
      group_token: groupToken,
      created_by_member_id: currentMember?.id ?? null,
    }));
    const { error } = await supabase.from("invitations").insert(rows);
    if (error) throw error;
    return { count: rows.length, groupToken };
  };
  const invite = useMutation({
    mutationFn: () => createBatch(parsed.valid, inviteRole),
    onSuccess: ({ count }) => {
      setEmails("");
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
      toast.success(
        count > 1
          ? t(
              `Pozvánka pro ${count} lidí vytvořena. Pošlete jim jeden společný odkaz níže.`,
              `Invitation for ${count} people created. Send them the one shared link below.`,
            )
          : t(
              "Pozvánka vytvořena. Pošlete ji e-mailem nebo sdílejte odkaz níže.",
              "Invitation created. Email it or share the link below.",
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
      ids,
      patch,
    }: {
      ids: string[];
      patch: { role?: string; status?: string };
    }) => {
      // Row-level security turns a refused change into "0 rows", not an error: check it.
      const { data, error } = await supabase
        .from("invitations")
        .update(patch)
        .in("id", ids)
        .select("id");
      if (error) throw error;
      if (data && data.length > 0 && data.length < ids.length)
        throw new Error(
          t(
            `změněno jen ${data.length} z ${ids.length}, zkuste to znovu`,
            `only ${data.length} of ${ids.length} changed, please try again`,
          ),
        );
      if (!data?.length)
        throw new Error(
          t(
            "nic se nezměnilo (pozvánky spravuje jen správce)",
            "nothing changed (only an admin manages invitations)",
          ),
        );
    },
    onSuccess: (_d, v) => {
      setCancelling(null);
      if (v.patch.status === "REVOKED")
        toast.success(t("Pozvánka zrušena.", "Invitation cancelled."));
      return queryClient.invalidateQueries({ queryKey: ["invitations"] });
    },
    onError: (error) => {
      setCancelling(null);
      toast.error(t(`Změna se nepodařila: ${error.message}`, `Change failed: ${error.message}`));
    },
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

  // Expired batch: one tap makes a fresh 7-day link for the people who never joined (bug 11).
  const regenerate = useMutation({
    mutationFn: async (batch: InvitationBatch) => {
      const emails = batch.expired.map((r) => r.email).filter((e): e is string => !!e);
      if (!emails.length) throw new Error(t("nikdo nečeká", "nobody is waiting"));
      // Close the old rows first: if that fails, no second live batch is made. The new link
      // keeps the cottage the old one was for, not whichever cottage is open now.
      const { error } = await supabase
        .from("invitations")
        .update({ status: "REVOKED" })
        .in(
          "id",
          batch.expired.map((r) => r.id),
        );
      if (error) throw error;
      return createBatch(
        emails,
        batch.admin ? "ADMIN" : "MEMBER",
        batch.expired[0]?.property_id ?? null,
      );
    },
    onSuccess: async ({ count }) => {
      await queryClient.invalidateQueries({ queryKey: ["invitations"] });
      toast.success(
        t(
          `Nový odkaz pro ${count} ${count === 1 ? "osobu" : "lidí"}, platí 7 dní.`,
          `New link for ${count} ${count === 1 ? "person" : "people"}, valid for 7 days.`,
        ),
      );
    },
    onError: (error) =>
      toast.error(
        t(`Obnovení se nepodařilo: ${error.message}`, `Could not renew: ${error.message}`),
      ),
  });

  const linkFor = (token: string) => inviteLink(window.location.origin, token);
  const batchToken = (b: InvitationBatch) =>
    b.groupToken ?? (b.rows.length === 1 ? b.rows[0]!.token : null);

  const copyInvite = async (token: string) => {
    setManualLink(null);
    try {
      await navigator.clipboard.writeText(linkFor(token));
      setManualLink(null);
      toast.success(t("Odkaz zkopírován.", "Link copied."));
    } catch {
      setManualLink({ token, url: linkFor(token) });
    }
  };

  const shareInvite = async (token: string) => {
    const url = linkFor(token);
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
    await copyInvite(token);
  };

  const mailInvite = (b: InvitationBatch, token: string) =>
    inviteMailto({
      to: b.pending.map((r) => r.email).filter((e): e is string => !!e),
      link: linkFor(token),
      chata: property?.name ?? account?.name ?? "My Chata",
      inviter: currentMember?.name,
      admin: b.admin,
    });

  const renderBatch = (b: InvitationBatch) => {
    const token = batchToken(b);
    const open = !!expanded[b.key];
    const days = daysUntil(b.expiresAt);
    const people = b.rows.length;
    const title =
      people === 1
        ? (b.rows[0]!.email ?? t("kdokoli s odkazem", "anyone with the link"))
        : t(`${people} e-mailů`, `${people} email addresses`);
    const actionClass =
      "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl bg-card py-1";
    return (
      <div className="space-y-2 rounded-2xl bg-secondary p-3">
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-[16px] font-bold">{title}</span>
          {b.state === "active" ? (
            <Button
              variant="fresh"
              size="fresh"
              className="pill min-h-11 bg-card px-3 text-muted-foreground"
              aria-label={t("Změnit roli", "Change role")}
              onClick={() =>
                updateInvite.mutate({
                  ids: b.pending.map((r) => r.id),
                  patch: { role: b.admin ? "MEMBER" : "ADMIN" },
                })
              }
            >
              {b.admin ? t("Správce", "Admin") : t("Člen", "Member")} ⇄
            </Button>
          ) : (
            <span className="pill bg-card text-muted-foreground">
              {b.admin ? t("Správce", "Admin") : t("Člen", "Member")}
            </span>
          )}
        </div>
        <p className="text-[15px] text-muted-foreground">
          {t(
            `Vytvořeno ${fmtDate(b.createdAt.slice(0, 10))}`,
            `Created ${fmtDate(b.createdAt.slice(0, 10))}`,
          )}
          {" · "}
          {b.state === "expired"
            ? t(
                `vypršelo ${fmtDate(b.expiresAt.slice(0, 10))}`,
                `expired ${fmtDate(b.expiresAt.slice(0, 10))}`,
              )
            : days < 1
              ? t("vyprší dnes", "expires today")
              : t(
                  `vyprší za ${days} ${days === 1 ? "den" : days < 5 ? "dny" : "dní"}`,
                  `expires in ${days} day${days === 1 ? "" : "s"}`,
                )}
          {people > 1 &&
            ` · ${t(`přijalo ${b.accepted.length} z ${people}`, `${b.accepted.length} of ${people} joined`)}`}
        </p>
        {b.state === "active" && token && (
          <div className="grid grid-cols-4 gap-2">
            <a
              className={actionClass}
              href={mailInvite(b, token)}
              aria-label={t("Poslat e-mailem", "Send by email")}
            >
              <Mail className="size-5" />
              <span className="text-[16px] font-bold">{t("E-mail", "Email")}</span>
            </a>
            <Button
              variant="fresh"
              size="fresh"
              className={actionClass}
              aria-label={t("Sdílet", "Share")}
              onClick={() => shareInvite(token)}
            >
              <Share2 className="size-5" />
              <span className="text-[16px] font-bold">{t("Sdílet", "Share")}</span>
            </Button>
            <Button
              variant="fresh"
              size="fresh"
              className={actionClass}
              aria-label={t("Zkopírovat odkaz", "Copy link")}
              onClick={() => copyInvite(token)}
            >
              <Copy className="size-5" />
              <span className="text-[16px] font-bold">{t("Kopírovat", "Copy")}</span>
            </Button>
            <Button
              variant="fresh"
              size="fresh"
              className={`${actionClass} text-muted-foreground`}
              aria-label={t("Zrušit pozvánku", "Cancel invitation")}
              onClick={() => setCancelling(b)}
            >
              <X className="size-5" />
              <span className="text-[16px] font-bold">{t("Zrušit", "Cancel")}</span>
            </Button>
          </div>
        )}
        {b.state === "active" && token && people > 1 && (
          <p className="text-[15px] text-muted-foreground">
            {t(
              "Jeden odkaz pro všechny. Funguje jen pro e-maily v této pozvánce.",
              "One link for everyone. It only works for the emails on this invitation.",
            )}
          </p>
        )}
        {token && <ManualCopyLink url={manualLink?.token === token ? manualLink.url : null} />}
        {b.state === "expired" && (
          <Button
            variant="fresh"
            size="fresh"
            className="btn-primary w-full"
            disabled={regenerate.isPending}
            onClick={() => regenerate.mutate(b)}
          >
            <RefreshCw className="size-5" />
            {regenerate.isPending && regenerate.variables?.key === b.key
              ? t("Vytvářím…", "Creating…")
              : t("Vytvořit nový odkaz", "Create a new link")}
          </Button>
        )}
        {people > 1 && (
          <Button
            variant="fresh"
            size="fresh"
            className="flex min-h-11 w-full items-center justify-between rounded-xl bg-card px-3 text-[16px] font-semibold"
            aria-expanded={open}
            onClick={() => setExpanded((e) => ({ ...e, [b.key]: !open }))}
          >
            {open ? t("Skrýt seznam", "Hide the list") : t("Zobrazit všechny", "See all")}
            <ChevronDown className={`size-5 transition-transform ${open ? "rotate-180" : ""}`} />
          </Button>
        )}
        {open && people > 1 && (
          <ul className="space-y-1.5">
            {b.rows.map((r) => {
              const joined = r.status === "ACCEPTED";
              const late = r.status === "PENDING" && daysUntil(r.expires_at) < 0;
              return (
                <li key={r.id} className="flex items-center gap-2 rounded-xl bg-card px-3 py-2">
                  <span className="min-w-0 flex-1 truncate text-[16px]">{r.email}</span>
                  <span
                    className={`pill ${joined ? "bg-ok-soft text-ok" : late ? "bg-secondary text-muted-foreground" : "bg-warn-soft text-warn-foreground"}`}
                  >
                    {joined
                      ? t("Přijato", "Joined")
                      : late
                        ? t("Vypršelo", "Expired")
                        : t("Čeká", "Waiting")}
                  </span>
                  {!b.groupToken && !joined && !late && (
                    <Button
                      variant="fresh"
                      size="fresh"
                      className="grid size-11 place-items-center rounded-full"
                      aria-label={t(
                        `Zkopírovat odkaz pro ${r.email}`,
                        `Copy the link for ${r.email}`,
                      )}
                      onClick={() => copyInvite(r.token)}
                    >
                      <Copy className="size-5" />
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {!b.groupToken && people > 1 && b.state === "active" && (
          <p className="text-[15px] text-muted-foreground">
            {t(
              "Starší pozvánka: každý má vlastní odkaz (v seznamu).",
              "Older invitation: each person has their own link (in the list).",
            )}
          </p>
        )}
      </div>
    );
  };

  return (
    <AppShell>
      <PageHeader
        title={t("Členové a oprávnění", "Members & permissions")}
        subtitle={accountContextLine(account, property?.name, t) ?? undefined}
        back="/vice"
      />

      {isAdmin && (
        <div className="card mt-4 space-y-3 p-4">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <UserPlus className="size-5 text-primary" />
            {t("Pozvat nového člena", "Invite a new member")}
          </h2>
          <label className="block">
            <span className="text-[16px] font-bold">
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
            <p className="text-[16px] font-semibold text-warn-foreground">
              {t(
                `Zkontrolujte: ${parsed.invalid.join(", ")}`,
                `Please check: ${parsed.invalid.join(", ")}`,
              )}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="fresh"
              size="fresh"
              className={`btn-secondary ${inviteRole === "MEMBER" ? "ring-2 ring-primary" : ""}`}
              onClick={() => setInviteRole("MEMBER")}
            >
              {t("Člen", "Member")}
            </Button>
            <Button
              variant="fresh"
              size="fresh"
              className={`btn-secondary ${inviteRole === "ADMIN" ? "ring-2 ring-primary" : ""}`}
              onClick={() => setInviteRole("ADMIN")}
            >
              {t("Správce", "Admin")}
            </Button>
          </div>
          <Button
            variant="fresh"
            size="fresh"
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
          </Button>
          <p className="text-[16px] text-muted-foreground">
            {t(
              "Všichni dostanou jeden společný odkaz, platný 7 dní. Použít ho můžou jen zadané e-maily. Roli můžete změnit i později.",
              "Everyone gets one shared link, valid for 7 days. Only the emails you entered can use it. You can change the role later.",
            )}
          </p>
          {activeBatches.length > 0 && (
            <div className="space-y-2">
              <p className="text-[16px] font-bold text-muted-foreground">
                {t("Čekající pozvánky", "Pending invitations")}
              </p>
              {activeBatches.map((b) => (
                <div key={b.key}>{renderBatch(b)}</div>
              ))}
            </div>
          )}
          {expiredBatches.length > 0 && (
            <div className="space-y-2">
              <p className="text-[16px] font-bold text-muted-foreground">
                {t("Vypršelé pozvánky", "Expired invitations")}
              </p>
              {expiredBatches.map((b) => (
                <div key={b.key}>{renderBatch(b)}</div>
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
                <p className="truncate text-[16px] text-muted-foreground">{m.email}</p>
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
                    <span className="pill bg-warn-soft text-warn-foreground">
                      {t("Zatím nepřihlášen", "Not signed in yet")}
                    </span>
                  )}
                </div>
              </div>
              {isAdmin && m.id !== currentMember?.id && m.user_id && (
                <Button
                  variant="fresh"
                  size="fresh"
                  className="flex min-h-11 max-w-[8.5rem] shrink-0 items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-left text-[16px] font-bold leading-tight disabled:opacity-50"
                  disabled={toggleRole.isPending}
                  aria-busy={changing}
                  onClick={() => toggleRole.mutate({ memberId: m.id, makeAdmin: !mIsAdmin })}
                >
                  {changing ? (
                    <Loader2 className="size-5 shrink-0 animate-spin" />
                  ) : mIsAdmin ? (
                    <UserMinus className="size-5 shrink-0" />
                  ) : (
                    <ShieldCheck className="size-5 shrink-0" />
                  )}
                  {mIsAdmin
                    ? t("Odebrat správce", "Remove admin")
                    : t("Udělat správcem", "Make admin")}
                </Button>
              )}
            </div>
          );
        })}
      </div>
      <ConfirmDialog
        open={!!cancelling}
        onOpenChange={(open) => !open && setCancelling(null)}
        title={
          (cancelling?.pending.length ?? 0) > 1
            ? t(
                `Zrušit pozvánku pro ${cancelling?.pending.length} lidí?`,
                `Cancel the invitation for ${cancelling?.pending.length} people?`,
              )
            : t(
                `Zrušit pozvánku pro ${cancelling?.pending[0]?.email ?? ""}?`,
                `Cancel the invitation for ${cancelling?.pending[0]?.email ?? ""}?`,
              )
        }
        description={t(
          "Odkaz z pozvánky přestane fungovat. Kdo ho už má, se nepřipojí; pak musíte poslat novou pozvánku.",
          "The invitation link will stop working. Anyone who already has it can't join; you would need to send a new invitation.",
        )}
        confirmLabel={t("Zrušit pozvánku", "Cancel invitation")}
        busy={updateInvite.isPending}
        onConfirm={() =>
          cancelling &&
          updateInvite.mutate({
            ids: cancelling.pending.map((r) => r.id),
            patch: { status: "REVOKED" },
          })
        }
      />
    </AppShell>
  );
}

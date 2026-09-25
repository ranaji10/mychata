import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/bits";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/account";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/profil")({
  staticData: { sitemap: false },
  head: () => ({ meta: [{ title: "My profile — My Chata" }, { name: "robots", content: "noindex" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { t } = useLang();
  const { user, profile, currentMember } = useAccount();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setName(profile?.display_name ?? (user?.user_metadata?.full_name as string | undefined) ?? "");
    setPhone(profile?.phone ?? "");
  }, [profile, user]);

  const save = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").upsert({ user_id: user.id, display_name: name, phone, avatar_url: (user.user_metadata?.avatar_url as string | undefined) ?? null });
    setBusy(false);
    if (error) toast.error(t("Uložení se nepodařilo.", "Could not save."));
    else {
      toast.success(t("Profil uložen.", "Profile saved."));
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    queryClient.clear();
    navigate({ to: "/auth", replace: true });
  };

  const avatarUrl = profile?.avatar_url ?? (user?.user_metadata?.avatar_url as string | undefined) ?? null;

  return (
    <AppShell>
      <PageHeader title={t("Můj profil", "My profile")} subtitle={user?.email ?? ""} />
      <div className="card mt-4 flex items-center gap-4 p-4">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="size-16 rounded-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <div className="grid size-16 place-items-center rounded-full bg-secondary text-xl font-bold text-muted-foreground">{(name || "?").slice(0, 1).toUpperCase()}</div>
        )}
        <div>
          <p className="text-lg font-bold">{name || t("Bez jména", "No name")}</p>
          <p className="text-[14px] text-muted-foreground">{currentMember?.role === "ADMIN" || currentMember?.role === "OWNER" ? t("Správce", "Admin") : t("Člen", "Member")}</p>
        </div>
      </div>
      <div className="card mt-4 space-y-3 p-4">
        <label className="block">
          <span className="text-[14px] font-bold">{t("Zobrazované jméno", "Display name")}</span>
          <input className="input mt-1 w-full" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="block">
          <span className="text-[14px] font-bold">{t("Telefon", "Phone")}</span>
          <input className="input mt-1 w-full" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        <button className="btn-primary w-full" disabled={busy} onClick={save}>
          {busy ? t("Ukládám…", "Saving…") : t("Uložit", "Save")}
        </button>
      </div>
      <button className="btn-secondary mt-4 w-full" onClick={signOut}>
        {t("Odhlásit se", "Sign out")}
      </button>
    </AppShell>
  );
}

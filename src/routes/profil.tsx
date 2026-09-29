import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/bits";
import { CottageSetup } from "@/components/CottageSetup";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/account";
import { normalizePhone, type Profile } from "@/lib/data";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/profil")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [{ title: "My profile — My Chata" }, { name: "robots", content: "noindex" }],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { t } = useLang();
  const { user, profile, currentMember, account, accounts, switchAccount } = useAccount();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  // Keyed on the stored values, not on the user/profile objects: those are replaced on every
  // auth event (token refresh, returning to the tab), which reset the fields mid-edit (B-008).
  const fullName = user?.user_metadata?.["full_name"] as string | undefined;
  useEffect(() => {
    setName(profile?.display_name ?? fullName ?? "");
    setPhone(profile?.phone ?? "");
  }, [profile?.display_name, profile?.phone, fullName]);

  const save = async () => {
    if (!user) return;
    setBusy(true);
    const normalized = normalizePhone(phone);
    if (!normalized) {
      setBusy(false);
      toast.error(
        t(
          "Telefon zadejte jako +420 777 123 456 (nebo 9 číslic pro české číslo).",
          "Enter the phone as +420 777 123 456 (or 9 digits for a Czech number).",
        ),
      );
      return;
    }
    const wantedPhone = normalized.value;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .upsert(
          {
            user_id: user.id,
            display_name: name.trim(),
            phone: wantedPhone,
            avatar_url: (user.user_metadata?.["avatar_url"] as string | undefined) ?? null,
          },
          { onConflict: "user_id" },
        )
        .select()
        .single();
      if (error) throw error;
      // Show what the database actually stored, and say so if it isn't what was typed.
      if ((data.phone ?? null) !== wantedPhone) throw new Error("phone_not_stored");
      queryClient.setQueryData(["profile", user.id], data as Profile);
      // Lists of people (members, expenses, calendar) show the member name, so keep it in step.
      if (name.trim().length > 1) {
        const { error: memberError } = await supabase
          .from("members")
          .update({ name: name.trim(), phone: wantedPhone })
          .eq("user_id", user.id);
        if (memberError) throw memberError;
        void queryClient.invalidateQueries({ queryKey: ["members"] });
        void queryClient.invalidateQueries({ queryKey: ["identity-members", user.id] });
      }
      toast.success(t("Profil uložen.", "Profile saved."));
    } catch (error) {
      console.error("[profil] save", error);
      const detail = (error as { message?: string } | null)?.message ?? String(error);
      toast.error(t(`Uložení se nepodařilo: ${detail}`, `Could not save: ${detail}`));
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    queryClient.clear();
    try {
      localStorage.removeItem("mychata.offline-cache");
    } catch {
      /* ignore */
    }
    navigate({ to: "/auth", replace: true });
  };

  const avatarUrl =
    profile?.avatar_url ?? (user?.user_metadata?.["avatar_url"] as string | undefined) ?? null;

  return (
    <AppShell>
      <PageHeader title={t("Můj profil", "My profile")} subtitle={user?.email ?? ""} />
      <div className="card mt-4 flex items-center gap-4 p-4">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="size-16 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="grid size-16 place-items-center rounded-full bg-secondary text-xl font-bold text-muted-foreground">
            {(name || "?").slice(0, 1).toUpperCase()}
          </div>
        )}
        <div>
          <p className="text-lg font-bold">{name || t("Bez jména", "No name")}</p>
          <p className="text-[14px] text-muted-foreground">
            {currentMember?.role === "ADMIN" || currentMember?.role === "OWNER"
              ? t("Správce", "Admin")
              : t("Člen", "Member")}
          </p>
        </div>
      </div>
      <div className="card mt-4 space-y-3 p-4">
        <label className="block">
          <span className="text-[14px] font-bold">{t("Zobrazované jméno", "Display name")}</span>
          <input
            className="field mt-1 w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="text-[14px] font-bold">{t("Telefon", "Phone")}</span>
          <input
            className="field mt-1 w-full"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+420 777 123 456"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            aria-invalid={!normalizePhone(phone)}
          />
          {!normalizePhone(phone) && (
            <span className="mt-1 block text-[14px] font-semibold text-warn">
              {t("Zadejte číslo jako +420 777 123 456.", "Enter the number as +420 777 123 456.")}
            </span>
          )}
        </label>
        <button className="btn-primary w-full" disabled={busy} onClick={save}>
          {busy ? t("Ukládám…", "Saving…") : t("Uložit", "Save")}
        </button>
      </div>
      {(!profile?.phone || !profile?.display_name) && (
        <p className="mt-3 rounded-2xl bg-warn-soft p-3 text-[14px] font-semibold text-warn">
          {!profile?.display_name && !profile?.phone
            ? t("Doplňte své jméno a telefon.", "Please add your name and phone number.")
            : !profile?.phone
              ? t(
                  "Doplňte telefon, aby vás ostatní zastihli.",
                  "Add your phone number so others can reach you.",
                )
              : t("Doplňte své jméno.", "Please add your name.")}
        </p>
      )}
      <CottageSetup />
      {accounts.length > 1 && (
        <section className="card mt-4 p-4">
          <h2 className="text-[15px] font-bold">{t("Moje účty", "My accounts")}</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {t(
              "Jste členem více účtů. Vyberte, se kterým chcete pracovat.",
              "You belong to several accounts. Choose which one to work in.",
            )}
          </p>
          <div className="mt-3 space-y-2">
            {accounts.map((a) => (
              <button
                key={a.id}
                className={a.id === account?.id ? "btn-primary w-full" : "btn-secondary w-full"}
                disabled={a.id === account?.id}
                onClick={() =>
                  switchAccount(a.id)
                    .then(() => navigate({ to: "/domu" }))
                    .catch(() => toast.error(t("Přepnutí se nezdařilo.", "Could not switch.")))
                }
              >
                {a.name}
              </button>
            ))}
          </div>
        </section>
      )}
      <button className="btn-secondary mt-4 w-full" onClick={signOut}>
        {t("Odhlásit se", "Sign out")}
      </button>
    </AppShell>
  );
}

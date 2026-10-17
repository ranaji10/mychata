import { Button } from "@/components/ui/button";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Camera, ChevronRight, KeyRound, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/bits";
import { InstitutionSetup } from "@/components/InstitutionSetup";
import { SetPasswordForm } from "@/components/SetPasswordForm";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/account";
import { avatarDataUrl } from "@/lib/avatar";
import { normalizePhone, type Profile } from "@/lib/data";
import { useLang } from "@/lib/i18n";
import { hasPassword } from "@/lib/password";
import { PhotoError } from "@/lib/photos";

export const Route = createFileRoute("/profil")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "My profile — My Chata" },
      { name: "robots", content: "noindex" },
      { name: "description", content: "Your My Chata profile and contact details." },
      { property: "og:title", content: "My profile — My Chata" },
      { property: "og:description", content: "Your My Chata profile and contact details." },
    ],
  }),
  // ?password=1 opens the password form (from the "set a password" prompt after onboarding).
  validateSearch: (search: Record<string, unknown>): { password?: boolean } =>
    search["password"] ? { password: true } : {},
  component: ProfilePage,
});

function ProfilePage() {
  const { t } = useLang();
  const { user, profile, account, accounts, memberships, switchAccount } = useAccount();
  const search = Route.useSearch();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(!!search.password);
  const photoInput = useRef<HTMLInputElement>(null);
  const passwordSection = useRef<HTMLElement>(null);
  useEffect(() => {
    if (search.password) passwordSection.current?.scrollIntoView({ block: "center" });
  }, [search.password]);
  const canSignInWithPassword = hasPassword(user);

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

  // Profile photo (bug 6): a small square, saved on the person's own profile row.
  const savePhoto = async (dataUrl: string | null) => {
    if (!user) return;
    setPhotoBusy(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .upsert({ user_id: user.id, avatar_url: dataUrl }, { onConflict: "user_id" })
        .select()
        .single();
      if (error) throw error;
      queryClient.setQueryData(["profile", user.id], data as Profile);
      toast.success(
        dataUrl ? t("Fotka uložena.", "Photo saved.") : t("Fotka odebrána.", "Photo removed."),
      );
    } catch (error) {
      console.error("[profil] photo", error);
      toast.error(t("Fotku se nepodařilo uložit.", "Could not save the photo."));
    } finally {
      setPhotoBusy(false);
    }
  };
  const pickPhoto = async (file: File | undefined) => {
    if (!file) return;
    try {
      await savePhoto(await avatarDataUrl(file));
    } catch (error) {
      console.error("[profil] photo read", error);
      toast.error(
        error instanceof PhotoError && error.kind === "wrong_type"
          ? t(
              "Tento soubor není fotka, kterou umíme přečíst.",
              "This file isn't a photo we can read.",
            )
          : t("Fotku se nepodařilo zpracovat.", "Could not process the photo."),
      );
    } finally {
      if (photoInput.current) photoInput.current.value = "";
    }
  };
  const signInMethod = canSignInWithPassword
    ? user?.identities?.some((i) => i.provider === "google")
      ? t("Google nebo e-mail a heslo", "Google or email and password")
      : t("E-mail a heslo", "Email and password")
    : t("Google", "Google");
  const roleIn = (accountId: string) => {
    const role = memberships.find((m) => m.account_id === accountId)?.role;
    return role === "ADMIN" || role === "OWNER" ? t("správce", "admin") : t("člen", "member");
  };

  return (
    <AppShell>
      <PageHeader title={t("Můj profil", "My profile")} back="/vice" />
      {/* Who is signed in, separate from which account is open (bug 2: an organisation named
          after a work email looked like the sign-in). */}
      <div className="card mt-4 p-4">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                className="size-20 rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="grid size-20 place-items-center rounded-full bg-secondary text-2xl font-bold text-muted-foreground">
                {(name || "?").slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold">{name || t("Bez jména", "No name")}</p>
            <p className="text-[16px] text-muted-foreground">
              {t("Přihlášen(a) jako", "Signed in as")}
            </p>
            <p className="truncate text-[16px] font-semibold">{user?.email}</p>
            <p className="text-[14px] text-muted-foreground">
              {t("Přihlášení:", "Sign-in:")} {signInMethod}
            </p>
          </div>
        </div>
        <input
          ref={photoInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void pickPhoto(e.target.files?.[0])}
        />
        <div className="mt-3 flex gap-2">
          <Button
            variant="fresh"
            size="fresh"
            className="btn-secondary flex-1"
            disabled={photoBusy}
            onClick={() => photoInput.current?.click()}
          >
            <Camera className="size-5" />
            {photoBusy
              ? t("Ukládám…", "Saving…")
              : profile?.avatar_url
                ? t("Změnit fotku", "Change photo")
                : t("Přidat fotku", "Add photo")}
          </Button>
          {profile?.avatar_url && (
            <Button
              variant="fresh"
              size="fresh"
              className="btn-secondary"
              disabled={photoBusy}
              aria-label={t("Odebrat fotku", "Remove photo")}
              onClick={() => void savePhoto(null)}
            >
              <Trash2 className="size-5" />
            </Button>
          )}
        </div>
      </div>
      <div className="card mt-4 space-y-3 p-4">
        <label className="block">
          <span className="text-[16px] font-bold">{t("Zobrazované jméno", "Display name")}</span>
          <input
            className="field mt-1 w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="text-[16px] font-bold">{t("Telefon", "Phone")}</span>
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
            <span className="mt-1 block text-[16px] font-semibold text-warn-foreground">
              {t("Zadejte číslo jako +420 777 123 456.", "Enter the number as +420 777 123 456.")}
            </span>
          )}
        </label>
        <Button
          variant="fresh"
          size="fresh"
          className="btn-primary w-full"
          disabled={busy}
          onClick={save}
        >
          {busy ? t("Ukládám…", "Saving…") : t("Uložit", "Save")}
        </Button>
      </div>
      {(!profile?.phone || !profile?.display_name) && (
        <p className="mt-3 rounded-2xl bg-warn-soft p-3 text-[16px] font-semibold text-warn-foreground">
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
      <section ref={passwordSection} className="card mt-4 p-4">
        <h2 className="flex items-center gap-2 text-[16px] font-bold">
          <KeyRound className="size-5 text-primary" />
          {canSignInWithPassword ? t("Heslo", "Password") : t("Nastavit heslo", "Set a password")}
        </h2>
        <p className="mt-1 text-[16px] text-muted-foreground">
          {canSignInWithPassword
            ? t(
                "Heslem se přihlašujete na jiných zařízeních přes „Přihlásit se“.",
                "You use the password to sign in on other devices with “Sign in”.",
              )
            : t(
                "Registrovali jste se přes Google, takže zatím nemáte heslo. Nastavte si ho, pokud se chcete přihlašovat i e-mailem a heslem (např. na cizím zařízení).",
                "You signed up with Google, so you have no password yet. Set one if you also want to sign in with email and password (e.g. on someone else's device).",
              )}
        </p>
        {passwordOpen ? (
          <div className="mt-3">
            <SetPasswordForm onDone={() => setPasswordOpen(false)} />
          </div>
        ) : (
          <Button
            variant="fresh"
            size="fresh"
            className="btn-secondary mt-3 w-full"
            onClick={() => setPasswordOpen(true)}
          >
            {canSignInWithPassword
              ? t("Změnit heslo", "Change password")
              : t("Nastavit heslo", "Set a password")}
          </Button>
        )}
      </section>
      <section className="card mt-4 p-4">
        <h2 className="text-[16px] font-bold">
          {t("Moje účty a chaty", "My accounts and cottages")}
        </h2>
        <p className="mt-1 text-[16px] text-muted-foreground">
          {t(
            `Všechny účty, ke kterým patří ${user?.email ?? ""}. Otevřený je zvýrazněný.`,
            `Every account ${user?.email ?? ""} belongs to. The open one is highlighted.`,
          )}
        </p>
        <div className="mt-3 space-y-2">
          {accounts.map((a) => (
            <Button
              variant="fresh"
              size="fresh"
              key={a.id}
              className={`${a.id === account?.id ? "btn-primary" : "btn-secondary"} w-full justify-between text-left disabled:opacity-100`}
              disabled={a.id === account?.id}
              aria-current={a.id === account?.id ? "true" : undefined}
              onClick={() =>
                switchAccount(a.id)
                  .then(() => navigate({ to: "/domu" }))
                  .catch(() => toast.error(t("Přepnutí se nezdařilo.", "Could not switch.")))
              }
            >
              <span className="min-w-0 truncate">{a.name}</span>
              <span className="shrink-0 text-[14px] font-semibold opacity-80">
                {a.type === "INSTITUTIONAL"
                  ? t("organizace", "organisation")
                  : t("rodina", "family")}{" "}
                · {roleIn(a.id)}
              </span>
            </Button>
          ))}
        </div>
        <Link
          to="/chaty"
          className="mt-3 flex min-h-11 items-center justify-between text-[16px] font-bold text-primary"
        >
          {t("Spravovat chaty", "Manage cottages")}
          <ChevronRight className="size-5" />
        </Link>
      </section>
      <InstitutionSetup />
      <Button variant="fresh" size="fresh" className="btn-secondary mt-4 w-full" onClick={signOut}>
        {t("Odhlásit se", "Sign out")}
      </Button>
    </AppShell>
  );
}

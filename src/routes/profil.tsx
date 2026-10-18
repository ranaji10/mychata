import { Button } from "@/components/ui/button";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Camera, ChevronRight, KeyRound, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Avatar, PageHeader } from "@/components/bits";
import { InstitutionSetup } from "@/components/InstitutionSetup";
import { SetPasswordForm } from "@/components/SetPasswordForm";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/account";
import { avatarSource } from "@/lib/account-label";
import { useMyCottages } from "@/lib/my-cottages";
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
      { title: "Můj profil — My Chata" },
      { name: "robots", content: "noindex" },
      { name: "description", content: "Your My Chata profile and contact details." },
      { property: "og:title", content: "Můj profil — My Chata" },
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
  const { user, profile, account, accounts, memberships, properties, currentMember } =
    useAccount();
  const { data: myCottages } = useMyCottages(user?.id);
  const [showAllAccounts, setShowAllAccounts] = useState(false);
  const search = Route.useSearch();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const nameInput = useRef<HTMLInputElement>(null);
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
  // Same starting point whichever way the person signed up (bug 14): their saved name, else
  // the name Google or the sign-up form gave, else the name on their membership.
  const fullName = (user?.user_metadata?.["full_name"] ?? user?.user_metadata?.["name"]) as
    | string
    | undefined;
  const memberName = currentMember?.name;
  useEffect(() => {
    setName(profile?.display_name || fullName || memberName || "");
    setPhone(profile?.phone ?? "");
  }, [profile?.display_name, profile?.phone, fullName, memberName]);

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

  const avatarUrl = avatarSource(profile, user);

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
  const usesGoogle = !!user?.identities?.some((i) => i.provider === "google");
  const signInMethod = [
    usesGoogle ? "Google" : null,
    canSignInWithPassword ? t("e-mail a heslo", "email and password") : null,
  ]
    .filter(Boolean)
    .join(t(" nebo ", " or "));
  const roleIn = (accountId: string) => {
    const role = memberships.find((m) => m.account_id === accountId)?.role;
    return role === "ADMIN" || role === "OWNER" ? t("správce", "admin") : t("člen", "member");
  };
  // A summary only (bug 9): no switching from here, and it stays short with many accounts.
  const ACCOUNTS_SHOWN = 5;
  const listedAccounts = showAllAccounts ? accounts : accounts.slice(0, ACCOUNTS_SHOWN);
  const cottageNames = (accountId: string): string[] | null =>
    myCottages
      ? (myCottages[accountId] ?? []).map((c) => c.name)
      : accountId === account?.id
        ? properties.map((p) => p.name)
        : null;
  const savedName = (profile?.display_name ?? "").trim();

  return (
    <AppShell>
      <PageHeader title={t("Můj profil", "My profile")} back="/vice" />
      {/* Who is signed in, separate from which account is open (bug 2: an organisation named
          after a work email looked like the sign-in). */}
      <div className="card mt-4 p-4">
        <div className="flex items-center gap-4">
          <Avatar name={name} src={avatarUrl} className="size-20 text-2xl" />
          <div className="min-w-0">
            {savedName ? (
              <p className="truncate text-lg font-bold">{savedName}</p>
            ) : (
              <button
                type="button"
                onClick={() => nameInput.current?.focus()}
                className="min-h-11 text-left text-lg font-bold text-primary underline"
              >
                {t("Doplňte své jméno", "Add your name")}
              </button>
            )}
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
            ref={nameInput}
            className="field mt-1 w-full"
            value={name}
            autoComplete="name"
            placeholder={t("Jméno a příjmení", "First and last name")}
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
          {t("Heslo", "Password")}
        </h2>
        <p className="mt-1 text-[16px] text-muted-foreground">
          {canSignInWithPassword
            ? t(
                "Heslem se přihlašujete na jiných zařízeních přes „Přihlásit se“.",
                "You use the password to sign in on other devices with “Sign in”.",
              )
            : t(
                "Zatím nemáte heslo. Nastavte si ho, pokud se chcete přihlašovat i e-mailem a heslem (např. na cizím zařízení).",
                "You have no password yet. Set one if you also want to sign in with email and password (e.g. on someone else's device).",
              )}
        </p>
        {passwordOpen ? (
          <div className="mt-3">
            <SetPasswordForm
              askCurrent={canSignInWithPassword}
              onDone={() => setPasswordOpen(false)}
            />
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
            "Přehled účtů a chat, ke kterým patříte. Otevřený účet je zvýrazněný; chaty spravujete ve Spravovat chaty.",
            "The accounts and cottages you belong to. The open one is highlighted; manage cottages in Manage cottages.",
          )}
        </p>
        <ul className="mt-3 space-y-2">
          {listedAccounts.map((a) => {
            const names = cottageNames(a.id);
            return (
              <li
                key={a.id}
                className={`rounded-2xl p-3 ${a.id === account?.id ? "bg-primary-soft" : "bg-secondary"}`}
                aria-current={a.id === account?.id ? "true" : undefined}
              >
                <div className="flex flex-wrap items-center gap-x-2">
                  <p className="min-w-0 flex-1 truncate font-bold">{a.name}</p>
                  <span className="shrink-0 text-[14px] font-semibold text-muted-foreground">
                    {a.type === "INSTITUTIONAL"
                      ? t("organizace", "organisation")
                      : t("rodina", "family")}{" "}
                    · {roleIn(a.id)}
                  </span>
                </div>
                {names && (
                  <p className="mt-0.5 text-[15px] text-muted-foreground">
                    {names.length === 0
                      ? t("Zatím žádná chata", "No cottage yet")
                      : names.length <= 3
                        ? names.join(", ")
                        : t(
                            `${names.slice(0, 3).join(", ")} a ${names.length - 3} dalších`,
                            `${names.slice(0, 3).join(", ")} and ${names.length - 3} more`,
                          )}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
        {accounts.length > ACCOUNTS_SHOWN && (
          <Button
            variant="fresh"
            size="fresh"
            className="btn-secondary mt-2 w-full"
            onClick={() => setShowAllAccounts((v) => !v)}
          >
            {showAllAccounts
              ? t("Zobrazit méně", "Show fewer")
              : t(`Zobrazit všechny (${accounts.length})`, `Show all (${accounts.length})`)}
          </Button>
        )}
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

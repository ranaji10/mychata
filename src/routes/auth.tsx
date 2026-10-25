import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import { useBrand } from "@/lib/brand";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Building2, Home, LogIn, Mail } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { LanguageToggle, useLang } from "@/lib/i18n";
import { pendingInvite } from "@/lib/pending-invite";
import { RETURN_CALENDAR_META, calendarFromMetadata, pendingCalendar } from "@/lib/pending-booking";
import { captureRecoveryFromUrl, recoveryPending } from "@/lib/password";
import { PasswordInput } from "@/components/PasswordInput";
import { authLinkError, isPublicEmailDomain } from "@/lib/signup";
import { useDefaultChataPhoto } from "@/lib/season";

export const Route = createFileRoute("/auth")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Přihlášení — My Chata" },
      {
        name: "description",
        content: "Bezpečné přihlášení a registrace do My Chata pro rodiny i organizace.",
      },
      { property: "og:title", content: "Přihlášení — My Chata" },
      {
        property: "og:description",
        content: "Bezpečné přihlášení a registrace do My Chata pro rodiny i organizace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  // From My profile → "Add an institution" (bug 5): open the institution sign-up pre-filled.
  validateSearch: (
    search: Record<string, unknown>,
  ): { mode?: "institute"; email?: string; org?: string } => ({
    ...(search["mode"] === "institute" ? { mode: "institute" as const } : {}),
    ...(typeof search["email"] === "string" ? { email: search["email"].slice(0, 200) } : {}),
    ...(typeof search["org"] === "string" ? { org: search["org"].slice(0, 120) } : {}),
  }),
  component: AuthPage,
});

// Three clear ways in (T-021): Google, a personal email sign-up, or an institution's work
// email. Signing in with an existing email account sits under the email option.
type Mode = "main" | "email" | "institute";

function AuthPage() {
  const defaultPhoto = useDefaultChataPhoto();
  const { t } = useLang();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const search = Route.useSearch();
  const [mode, setMode] = useState<Mode>(search.mode ?? "main");
  useBrand(mode === "institute" ? "institution" : "family");
  const [isSignUp, setIsSignUp] = useState(true);
  const [name, setName] = useState("");
  const [organisation, setOrganisation] = useState(search.org ?? "");
  const [email, setEmail] = useState(search.email ?? "");
  const [password, setPassword] = useState("");
  // Offer "send the confirmation email again" when it can help.
  const [canResend, setCanResend] = useState(false);

  // After any sign-in (including Google's redirect back to /auth), go to a waiting invitation
  // first, otherwise Home (B-013).
  const goOn = useCallback(
    (user?: User | null) => {
      // A reset-password link signs the person in here: new password first (bug 4).
      if (recoveryPending()) {
        navigate({ to: "/reset-password", replace: true });
        return;
      }
      const token = pendingInvite();
      if (token) {
        navigate({ to: "/pozvanka/$token", params: { token }, replace: true });
        return;
      }
      // "Request a booking" on a public calendar (T-043): back to that calendar. The account's
      // metadata covers a confirmation link opened in another browser.
      const calendar =
        pendingCalendar() ?? calendarFromMetadata(user?.user_metadata, user?.created_at);
      if (calendar) {
        navigate({ to: "/verejne/kalendar/$token", params: { token: calendar }, replace: true });
        return;
      }
      navigate({ to: "/domu", replace: true });
    },
    [navigate],
  );

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) goOn(data.user);
    });
    // A confirmation link's session can arrive a moment after the first check (PR #66 review).
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user && !captureRecoveryFromUrl(window.location.href))
        goOn(session.user);
    });
    return () => sub.subscription.unsubscribe();
  }, [goOn]);

  // Opened from a public calendar's "Request a booking": say why, and start at sign-up.
  const [returnCalendar] = useState(() =>
    typeof window === "undefined" ? null : pendingCalendar(),
  );

  // A confirmation link opened a second time (or too late) lands here with an error in the
  // address. Opening it once already confirmed the email, so signing in works (T-021).
  useEffect(() => {
    const linkError = authLinkError(window.location.hash);
    if (!linkError) return;
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    setMode("email");
    setIsSignUp(false);
    setCanResend(true);
    setError(
      linkError === "expired"
        ? t(
            "Tento odkaz už byl použit nebo vypršel. Pokud jste na něj už klikli, váš e-mail je potvrzený: přihlaste se níže heslem a dokončete nastavení. Jinak zadejte e-mail a pošleme nový odkaz.",
            "This link was already used or has expired. If you clicked it before, your email is confirmed: sign in below with your password to finish setting up. Otherwise enter your email and we'll send a new link.",
          )
        : t(
            "Odkaz nefungoval. Přihlaste se, nebo si pošlete nový.",
            "The link didn't work. Sign in, or send yourself a new one.",
          ),
    );
  }, [t]);

  // Friendly text for the errors people actually hit; the raw message stays visible for support.
  const explain = (message: string) => {
    const m = message.toLowerCase();
    if (m.includes("invalid login credentials"))
      return t(
        "Nesprávný e-mail nebo heslo. Pokud jste se registrovali přes Google, použijte „Pokračovat přes Google“, nebo si heslo nastavte přes „Zapomenuté heslo“.",
        "Wrong email or password. If you signed up with Google, use “Continue with Google”, or create a password with “Forgot password”.",
      );
    if (m.includes("email not confirmed"))
      return t(
        "E-mail ještě není potvrzený. Klikněte na odkaz v potvrzovacím e-mailu (zkontrolujte i spam), nebo si pošlete nový.",
        "Your email isn't confirmed yet. Click the link in the confirmation email (check spam too), or send a new one.",
      );
    if (m.includes("already registered") || m.includes("already been registered"))
      return t(
        "Tento e-mail už má účet. Přihlaste se, nebo si obnovte heslo.",
        "This email already has an account. Sign in, or reset your password.",
      );
    if (m.includes("rate limit") || m.includes("over_email_send_rate_limit"))
      return t(
        "Poslali jsme příliš mnoho e-mailů. Zkuste to za hodinu, nebo použijte Google.",
        "Too many emails sent. Try again in an hour, or use Google.",
      );
    if (m.includes("known to be weak") || m.includes("pwned"))
      return t(
        "Toto heslo se objevilo v únicích dat. Zvolte jiné.",
        "This password has appeared in data leaks. Please choose another one.",
      );
    if (m.includes("password") && (m.includes("at least") || m.includes("weak")))
      return t(
        "Heslo je příliš slabé (alespoň 8 znaků).",
        "Password too weak (at least 8 characters).",
      );
    return t(`Nepodařilo se: ${message}`, `That didn't work: ${message}`);
  };

  const signInGoogle = async () => {
    setBusy(true);
    setError("");
    track("login_start", { method: "google", source: returnCalendar ? "public_calendar" : "app" });
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/auth",
    });
    if (result.error) {
      setError(t("Přihlášení se nezdařilo.", "Sign-in failed."));
      setBusy(false);
    }
  };

  const cleanEmail = email.trim().toLowerCase();
  const institutePublicEmail =
    mode === "institute" && !!cleanEmail && isPublicEmailDomain(cleanEmail);

  const resendConfirmation = async () => {
    if (!cleanEmail) {
      setError(t("Zadejte e-mail.", "Enter your email."));
      return;
    }
    setBusy(true);
    setError("");
    const { error: err } = await supabase.auth.resend({
      type: "signup",
      email: cleanEmail,
      options: { emailRedirectTo: window.location.origin + "/auth" },
    });
    setBusy(false);
    if (err) {
      console.error("[auth] resend", err);
      setError(explain(err.message));
      return;
    }
    setInfo(
      t(
        "Pokud účet ještě nebyl potvrzený, poslali jsme nový potvrzovací e-mail (zkontrolujte i spam). Už potvrzený účet se jen přihlásí heslem.",
        "If the account wasn't confirmed yet, we sent a new confirmation email (check spam too). An account that's already confirmed just signs in with its password.",
      ),
    );
  };

  const submit = async () => {
    setBusy(true);
    setError("");
    setInfo("");
    setCanResend(false);
    try {
      // Call the methods on supabase.auth itself: a detached `const fn = supabase.auth.signUp`
      // loses its `this` and crashed before any request was sent (B-014).
      if (isSignUp || mode === "institute") {
        if (mode === "institute" && isPublicEmailDomain(cleanEmail)) return;
        const { data, error: err } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            emailRedirectTo: window.location.origin + "/auth",
            // Onboarding pre-fills the name (and the organisation) from these.
            data: {
              full_name: name.trim(),
              signup_kind: mode === "institute" ? "institution" : "personal",
              ...(mode === "institute" ? { organisation: organisation.trim() } : {}),
              ...(returnCalendar ? { [RETURN_CALENDAR_META]: returnCalendar } : {}),
            },
          },
        });
        if (err) throw err;
        track("sign_up", {
          method: "email",
          source: returnCalendar ? "public_calendar" : mode === "institute" ? "institution" : "app",
        });
        if (data.session) {
          goOn();
          return;
        }
        // Supabase answers "ok" without sending anything when the email is already
        // registered (no identities). Send the confirmation again in case it was never
        // confirmed, and say what to do either way (T-021).
        if (data.user && (data.user.identities?.length ?? 0) === 0) {
          const { error: resendError } = await supabase.auth.resend({
            type: "signup",
            email: cleanEmail,
            options: { emailRedirectTo: window.location.origin + "/auth" },
          });
          if (resendError) console.error("[auth] resend after sign-up", resendError);
          setIsSignUp(false);
          if (mode === "institute") setMode("email");
          setInfo(
            t(
              "Tento e-mail už je zaregistrovaný. Pokud jste ho ještě nepotvrdili, poslali jsme nový potvrzovací e-mail. Jinak se přihlaste heslem, nebo si ho obnovte.",
              "This email is already registered. If you never confirmed it, we just sent a new confirmation email. Otherwise sign in with your password, or reset it.",
            ),
          );
          return;
        }
        setCanResend(true);
        setInfo(
          t(
            "Poslali jsme vám potvrzovací e-mail. Klikněte na odkaz v něm (zkontrolujte i spam).",
            "We sent you a confirmation email. Click the link in it (check spam too).",
          ),
        );
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (err) {
          if (err.message.toLowerCase().includes("email not confirmed")) setCanResend(true);
          throw err;
        }
        track("login", { method: "email" });
        goOn();
      }
    } catch (e) {
      console.error("[auth] password", e);
      setError(explain((e as { message?: string } | null)?.message ?? String(e)));
    } finally {
      setBusy(false);
    }
  };

  const signingUp = mode === "institute" || isSignUp;
  const canSubmit =
    !busy &&
    !!cleanEmail &&
    !!password &&
    (!signingUp || name.trim().length > 1) &&
    (mode !== "institute" || (organisation.trim().length > 1 && !institutePublicEmail));

  const open = (next: Mode, signUp: boolean) => {
    setMode(next);
    setIsSignUp(signUp);
    setError("");
    setInfo("");
    setCanResend(false);
  };

  return (
    <main className="page-fresh mx-auto flex min-h-screen max-w-[420px] md:max-w-[560px] flex-col px-5 py-5 md:py-8">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid size-10 place-items-center rounded-[12px] bg-primary text-primary-foreground">
            <Home className="size-6" strokeWidth={2} />
          </span>
          <span className="text-lg font-extrabold">My Chata</span>
        </div>
        <LanguageToggle />
      </div>
      <img
        src={defaultPhoto.src}
        srcSet={defaultPhoto.srcSet}
        sizes={defaultPhoto.sizes}
        alt={defaultPhoto.alt}
        width={1200}
        height={1200}
        fetchPriority="high"
        className="mt-6 h-[250px] w-full rounded-[28px] object-cover object-[50%_42%]"
      />
      <section className="py-6">
        <h1 className="mt-1 text-[32px] font-extrabold leading-[1.12]">
          {mode === "main"
            ? t("Společná chata, bez zmatků.", "One shared chata, no muddle.")
            : mode === "institute"
              ? t("Registrace instituce", "Sign up as an institution")
              : t("Přihlaste se ke své chatě", "Sign in to your cottage")}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {t(
            mode === "main"
              ? "Kalendář, úkoly, výdaje a návod k chatě na jednom místě."
              : "Vaše pobyty, úkoly, výdaje a dokumenty zůstávají soukromé.",
            mode === "main"
              ? "Calendar, tasks, expenses and the house manual in one place."
              : "Your stays, tasks, expenses, and documents stay private.",
          )}
        </p>

        {returnCalendar && (
          <p className="mt-4 rounded-2xl bg-primary-soft p-3 font-semibold" role="status">
            {t(
              "Žádost o termín: založte si účet (nebo se přihlaste) a potvrďte e-mail. Pak vás vrátíme do kalendáře chaty, kde žádost dokončíte.",
              "Booking request: create an account (or sign in) and confirm your email. We then bring you back to the cottage's calendar to finish the request.",
            )}
          </p>
        )}
        {error && (
          <p className="mt-4 rounded-2xl bg-destructive-soft p-3 font-semibold text-destructive">
            {error}
          </p>
        )}
        {info && <p className="mt-4 rounded-2xl bg-ok-soft p-3 font-semibold text-ok">{info}</p>}

        {mode === "main" ? (
          <div className="mt-6 space-y-3">
            <Button
              variant="fresh"
              size="fresh"
              onClick={signInGoogle}
              disabled={busy}
              className="btn-primary min-h-[56px] w-full text-[17px]"
            >
              <LogIn className="size-5" />
              {busy
                ? t("Přihlašuji…", "Signing in…")
                : t("Pokračovat přes Google", "Continue with Google")}
            </Button>
            <Button
              variant="fresh"
              size="fresh"
              className="btn-secondary min-h-[56px] w-full text-[17px]"
              onClick={() => open("email", true)}
            >
              <Mail className="size-5" />
              {t("Registrovat se e-mailem", "Sign up with email")}
            </Button>
            <Button
              variant="fresh"
              size="fresh"
              className="btn-secondary btn-secondary-institution min-h-[56px] w-full text-[17px]"
              onClick={() => open("institute", true)}
            >
              <Building2 className="size-5" />
              {t("Registrovat instituci", "Sign up as an institution")}
            </Button>
            <p className="pt-1 text-center text-[16px] text-muted-foreground">
              {t("Už máte účet?", "Already have an account?")}{" "}
              <Button
                variant="fresh"
                size="fresh"
                className="min-h-11 font-semibold text-primary"
                onClick={() => open("email", false)}
              >
                {t("Přihlásit se", "Sign in")}
              </Button>
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            <h2 className="text-lg font-bold">
              {mode === "institute"
                ? t("Registrace instituce", "Sign up as an institution")
                : isSignUp
                  ? t("Registrace e-mailem", "Sign up with email")
                  : t("Přihlášení e-mailem", "Sign in with email")}
            </h2>
            {mode === "institute" && (
              <p className="text-[16px] text-muted-foreground">
                {t(
                  "Pro školy, firmy, odbory a spolky. Použijte pracovní e-mail vaší organizace (např. @vase-skola.cz).",
                  "For schools, companies, unions and clubs. Use your organisation's work email (e.g. @your-school.cz).",
                )}
              </p>
            )}
            {mode === "institute" && (
              <input
                className="field w-full"
                placeholder={t("Název organizace", "Organisation name")}
                value={organisation}
                onChange={(e) => setOrganisation(e.target.value)}
                autoComplete="organization"
              />
            )}
            {signingUp && (
              <input
                className="field w-full"
                placeholder={t("Vaše jméno a příjmení", "Your full name")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            )}
            <input
              className="field w-full"
              type="email"
              placeholder={
                mode === "institute" ? t("Pracovní e-mail", "Work email") : t("E-mail", "Email")
              }
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              aria-invalid={institutePublicEmail}
            />
            {institutePublicEmail && (
              <p className="rounded-2xl bg-warn-soft p-3 text-[16px] font-semibold text-warn-foreground">
                {t(
                  "Pro instituci použijte pracovní e-mail, ne veřejnou schránku (Gmail, Seznam…). Pro rodinu zvolte „Registrovat se e-mailem“.",
                  "For an institution, use a work email, not a public mailbox (Gmail, Outlook…). For a family, choose “Sign up with email”.",
                )}
              </p>
            )}
            <PasswordInput
              placeholder={
                signingUp
                  ? t("Heslo (alespoň 8 znaků)", "Password (at least 8 characters)")
                  : t("Heslo", "Password")
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={signingUp ? "new-password" : "current-password"}
            />
            <Button
              variant="fresh"
              size="fresh"
              className="btn-primary min-h-[56px] w-full text-[17px]"
              disabled={!canSubmit}
              onClick={submit}
            >
              {busy
                ? t("Pracuji…", "Working…")
                : signingUp
                  ? t("Vytvořit účet", "Create account")
                  : t("Přihlásit se", "Sign in")}
            </Button>
            {canResend && (
              <Button
                variant="fresh"
                size="fresh"
                className="btn-secondary min-h-[56px] w-full text-[17px]"
                disabled={busy || !cleanEmail}
                onClick={resendConfirmation}
              >
                <Mail className="size-5" />
                {t("Poslat potvrzovací e-mail znovu", "Send the confirmation email again")}
              </Button>
            )}
            {mode === "email" && (
              <div className="flex flex-wrap items-center justify-between gap-2 text-[16px]">
                <Button
                  variant="fresh"
                  size="fresh"
                  className="min-h-11 font-semibold text-primary"
                  onClick={() => open("email", !isSignUp)}
                >
                  {isSignUp
                    ? t("Už mám účet – přihlásit se", "I have an account – sign in")
                    : t("Nemám účet – zaregistrovat se", "No account – sign up")}
                </Button>
                {!isSignUp && (
                  <Button
                    variant="fresh"
                    size="fresh"
                    className="min-h-11 font-semibold text-muted-foreground"
                    onClick={() => navigate({ to: "/reset-password" })}
                  >
                    {t("Zapomenuté heslo", "Forgot password")}
                  </Button>
                )}
              </div>
            )}
            <Button
              variant="fresh"
              size="fresh"
              className="min-h-11 w-full text-center text-[16px] font-semibold text-muted-foreground"
              onClick={() => open("main", true)}
            >
              {t("Zpět", "Back")}
            </Button>
          </div>
        )}
      </section>
    </main>
  );
}

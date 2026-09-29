import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Building2, LogIn, Mail } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { LanguageToggle, useLang } from "@/lib/i18n";
import { pendingInvite } from "@/lib/pending-invite";
import { authLinkError, isPublicEmailDomain } from "@/lib/signup";
import chataImg from "@/assets/chata.jpg";

export const Route = createFileRoute("/auth")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Sign in — My Chata" },
      { name: "description", content: "Secure sign in to your My Chata account." },
      { property: "og:title", content: "Sign in — My Chata" },
      { property: "og:description", content: "Secure sign in to your My Chata account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

// Three clear ways in (T-021): Google, a personal email sign-up, or an institution's work
// email. Signing in with an existing email account sits under the email option.
type Mode = "main" | "email" | "institute";

function AuthPage() {
  const { t } = useLang();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [mode, setMode] = useState<Mode>("main");
  const [isSignUp, setIsSignUp] = useState(true);
  const [name, setName] = useState("");
  const [organisation, setOrganisation] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Offer "send the confirmation email again" when it can help.
  const [canResend, setCanResend] = useState(false);

  // After any sign-in (including Google's redirect back to /auth), go to a waiting invitation
  // first, otherwise Home (B-013).
  const goOn = useCallback(() => {
    const token = pendingInvite();
    if (token) navigate({ to: "/pozvanka/$token", params: { token }, replace: true });
    else navigate({ to: "/domu", replace: true });
  }, [navigate]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) goOn();
    });
  }, [goOn]);

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
      return t("Nesprávný e-mail nebo heslo.", "Wrong email or password.");
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
            },
          },
        });
        if (err) throw err;
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
    <main className="mx-auto flex min-h-screen max-w-[420px] flex-col bg-background p-4">
      <div className="flex justify-end">
        <LanguageToggle />
      </div>
      <img
        src={chataImg}
        alt={t("Dřevěná chata", "Wooden cottage")}
        className="mt-4 aspect-[16/10] w-full rounded-3xl object-cover"
      />
      <section className="py-8">
        <p className="font-bold text-primary">My Chata</p>
        <h1 className="mt-1 text-3xl font-bold">
          {t("Přihlaste se ke své chatě", "Sign in to your cottage")}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {t(
            "Vaše pobyty, úkoly, výdaje a dokumenty zůstávají soukromé.",
            "Your stays, tasks, expenses, and documents stay private.",
          )}
        </p>

        {error && (
          <p className="mt-4 rounded-2xl bg-primary-soft p-3 font-semibold text-primary">{error}</p>
        )}
        {info && <p className="mt-4 rounded-2xl bg-ok-soft p-3 font-semibold text-ok">{info}</p>}

        {mode === "main" ? (
          <div className="mt-6 space-y-3">
            <button onClick={signInGoogle} disabled={busy} className="btn-primary w-full">
              <LogIn className="size-5" />
              {busy
                ? t("Přihlašuji…", "Signing in…")
                : t("Pokračovat přes Google", "Continue with Google")}
            </button>
            <button className="btn-secondary w-full" onClick={() => open("email", true)}>
              <Mail className="size-5" />
              {t("Registrovat se e-mailem", "Sign up with email")}
            </button>
            <button className="btn-secondary w-full" onClick={() => open("institute", true)}>
              <Building2 className="size-5" />
              {t("Registrovat instituci", "Sign up as an Institute")}
            </button>
            <p className="pt-1 text-center text-[14px] text-muted-foreground">
              {t("Už máte účet s e-mailem?", "Already have an email account?")}{" "}
              <button
                className="min-h-11 font-semibold text-primary"
                onClick={() => open("email", false)}
              >
                {t("Přihlásit se", "Sign in")}
              </button>
            </p>
          </div>
        ) : (
          <div className="card mt-6 space-y-3 p-4">
            <h2 className="text-lg font-bold">
              {mode === "institute"
                ? t("Registrace instituce", "Sign up as an Institute")
                : isSignUp
                  ? t("Registrace e-mailem", "Sign up with email")
                  : t("Přihlášení e-mailem", "Sign in with email")}
            </h2>
            {mode === "institute" && (
              <p className="text-[14px] text-muted-foreground">
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
              placeholder={mode === "institute" ? t("Pracovní e-mail", "Work email") : "E-mail"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              aria-invalid={institutePublicEmail}
            />
            {institutePublicEmail && (
              <p className="rounded-2xl bg-warn-soft p-3 text-[14px] font-semibold text-warn">
                {t(
                  "Pro instituci použijte pracovní e-mail, ne veřejnou schránku (Gmail, Seznam…). Pro rodinu zvolte „Registrovat se e-mailem“.",
                  "For an institution, use a work email, not a public mailbox (Gmail, Outlook…). For a family, choose “Sign up with email”.",
                )}
              </p>
            )}
            <input
              className="field w-full"
              type="password"
              placeholder={
                signingUp
                  ? t("Heslo (alespoň 8 znaků)", "Password (at least 8 characters)")
                  : t("Heslo", "Password")
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={signingUp ? "new-password" : "current-password"}
            />
            <button className="btn-primary w-full" disabled={!canSubmit} onClick={submit}>
              {busy
                ? t("Pracuji…", "Working…")
                : signingUp
                  ? t("Vytvořit účet", "Create account")
                  : t("Přihlásit se", "Sign in")}
            </button>
            {canResend && (
              <button
                className="btn-secondary w-full"
                disabled={busy || !cleanEmail}
                onClick={resendConfirmation}
              >
                <Mail className="size-5" />
                {t("Poslat potvrzovací e-mail znovu", "Send the confirmation email again")}
              </button>
            )}
            {mode === "email" && (
              <div className="flex items-center justify-between gap-2 text-[14px]">
                <button
                  className="min-h-11 font-semibold text-primary"
                  onClick={() => open("email", !isSignUp)}
                >
                  {isSignUp
                    ? t("Už mám účet – přihlásit se", "I have an account – sign in")
                    : t("Nemám účet – zaregistrovat se", "No account – sign up")}
                </button>
                {!isSignUp && (
                  <button
                    className="min-h-11 font-semibold text-muted-foreground"
                    onClick={() => navigate({ to: "/reset-password" })}
                  >
                    {t("Zapomenuté heslo", "Forgot password")}
                  </button>
                )}
              </div>
            )}
            <button
              className="min-h-11 w-full text-center text-[14px] font-semibold text-muted-foreground"
              onClick={() => open("main", true)}
            >
              {t("Zpět", "Back")}
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

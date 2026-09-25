import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LogIn, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { LanguageToggle, useLang } from "@/lib/i18n";
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

type Mode = "main" | "password" | "magic";

function AuthPage() {
  const { t } = useLang();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [mode, setMode] = useState<Mode>("main");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/domu", replace: true });
    });
  }, [navigate]);

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

  const signInPassword = async () => {
    setBusy(true);
    setError("");
    setInfo("");
    const fn = isSignUp ? supabase.auth.signUp : supabase.auth.signInWithPassword;
    const { error: err } = await fn({
      email,
      password,
      ...(isSignUp ? { options: { emailRedirectTo: window.location.origin + "/auth" } } : {}),
    } as never);
    setBusy(false);
    if (err) {
      setError(
        t(
          "Přihlášení se nezdařilo. Zkontrolujte e-mail a heslo.",
          "Sign-in failed. Check your email and password.",
        ),
      );
    } else if (isSignUp) {
      setInfo(
        t(
          "Poslali jsme vám potvrzovací e-mail. Klikněte na odkaz v něm.",
          "We sent you a confirmation email. Click the link in it.",
        ),
      );
    }
  };

  const sendMagicLink = async () => {
    setBusy(true);
    setError("");
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + "/auth" },
    });
    setBusy(false);
    if (err) setError(t("Odkaz se nepodařilo odeslat.", "Could not send the link."));
    else
      setInfo(
        t("Poslali jsme vám přihlašovací odkaz na e-mail.", "We emailed you a sign-in link."),
      );
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

        <button onClick={signInGoogle} disabled={busy} className="btn-primary mt-6 w-full">
          <LogIn className="size-5" />
          {busy
            ? t("Přihlašuji…", "Signing in…")
            : t("Pokračovat přes Google", "Continue with Google")}
        </button>

        {mode === "main" ? (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button className="btn-secondary" onClick={() => setMode("password")}>
              {t("E-mail a heslo", "Email & password")}
            </button>
            <button className="btn-secondary" onClick={() => setMode("magic")}>
              {t("Odkaz e-mailem", "Email me a link")}
            </button>
          </div>
        ) : (
          <div className="card mt-4 space-y-3 p-4">
            <input
              className="field w-full"
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            {mode === "password" && (
              <input
                className="field w-full"
                type="password"
                placeholder={t("Heslo", "Password")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isSignUp ? "new-password" : "current-password"}
              />
            )}
            {mode === "password" ? (
              <>
                <button
                  className="btn-primary w-full"
                  disabled={busy || !email || !password}
                  onClick={signInPassword}
                >
                  {isSignUp ? t("Vytvořit účet", "Create account") : t("Přihlásit se", "Sign in")}
                </button>
                <div className="flex items-center justify-between text-[14px]">
                  <button
                    className="font-semibold text-primary"
                    onClick={() => setIsSignUp(!isSignUp)}
                  >
                    {isSignUp
                      ? t("Už mám účet", "I have an account")
                      : t("Nemám účet — zaregistrovat se", "No account — sign up")}
                  </button>
                  {!isSignUp && (
                    <button
                      className="font-semibold text-muted-foreground"
                      onClick={() => navigate({ to: "/reset-password" })}
                    >
                      {t("Zapomenuté heslo", "Forgot password")}
                    </button>
                  )}
                </div>
              </>
            ) : (
              <button
                className="btn-primary w-full"
                disabled={busy || !email}
                onClick={sendMagicLink}
              >
                <Mail className="size-5" />
                {t("Poslat přihlašovací odkaz", "Send sign-in link")}
              </button>
            )}
            <button
              className="w-full text-center text-[14px] font-semibold text-muted-foreground"
              onClick={() => setMode("main")}
            >
              {t("Zpět", "Back")}
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

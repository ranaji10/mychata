import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LanguageToggle, useLang } from "@/lib/i18n";

export const Route = createFileRoute("/reset-password")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [{ title: "Reset password — My Chata" }, { name: "robots", content: "noindex" }],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { t } = useLang();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const send = async () => {
    setBusy(true);
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/auth",
    });
    setBusy(false);
    setSent(true);
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-[420px] flex-col bg-background p-4">
      <div className="flex justify-end">
        <LanguageToggle />
      </div>
      <h1 className="mt-10 text-2xl font-bold">{t("Obnovení hesla", "Reset password")}</h1>
      {sent ? (
        <p className="mt-4 rounded-2xl bg-ok-soft p-3 font-semibold text-ok">
          {t(
            "Pokud účet existuje, poslali jsme odkaz na e-mail.",
            "If the account exists, we emailed a reset link.",
          )}
        </p>
      ) : (
        <div className="card mt-4 space-y-3 p-4">
          <input
            className="field w-full"
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button className="btn-primary w-full" disabled={busy || !email} onClick={send}>
            {t("Poslat odkaz", "Send link")}
          </button>
        </div>
      )}
      <Link to="/auth" className="mt-4 text-center text-[14px] font-semibold text-primary">
        {t("Zpět na přihlášení", "Back to sign in")}
      </Link>
    </main>
  );
}

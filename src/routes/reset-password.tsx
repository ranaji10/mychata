import { Home } from "lucide-react";
import { useBrand } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { SetPasswordForm } from "@/components/SetPasswordForm";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/account";
import { LanguageToggle, useLang } from "@/lib/i18n";
import { clearRecovery, recoveryPending } from "@/lib/password";
import { pendingInvite } from "@/lib/pending-invite";

export const Route = createFileRoute("/reset-password")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Obnovení hesla — My Chata" },
      { name: "description", content: "Požádejte o odkaz pro obnovení hesla k účtu My Chata." },
      { property: "og:title", content: "Obnovení hesla — My Chata" },
      {
        property: "og:description",
        content: "Požádejte o odkaz pro obnovení hesla k účtu My Chata.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { t } = useLang();
  useBrand("family");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const { user, loading } = useAccount();
  const navigate = useNavigate();
  // Arrived from the emailed link: the link signed them in, now they choose the new password
  // and carry on signed in (bug 4: the link used to drop people straight into onboarding).
  const choosing = !!user && recoveryPending();

  const afterNewPassword = () => {
    clearRecovery();
    const token = pendingInvite();
    if (token) navigate({ to: "/pozvanka/$token", params: { token }, replace: true });
    // Home sends anyone without a cottage on to onboarding.
    else navigate({ to: "/domu", replace: true });
  };

  const send = async () => {
    setBusy(true);
    setFailed(false);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/auth",
      });
      if (error) throw error;
      setSent(true);
    } catch (e) {
      console.error("resetPasswordForEmail failed", e);
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-[420px] flex-col page-fresh px-5 py-5 md:max-w-[480px] md:py-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid size-10 place-items-center rounded-[12px] bg-primary text-primary-foreground">
            <Home className="size-6" />
          </span>
          <span className="text-lg font-extrabold">My Chata</span>
        </div>
        <LanguageToggle />
      </div>
      <h1 className="mt-10 text-[28px] font-extrabold leading-[1.15]">
        {choosing ? t("Nové heslo", "New password") : t("Obnovení hesla", "Reset password")}
      </h1>
      {loading ? null : choosing ? (
        <div className="mt-6 space-y-3">
          <p className="text-[16px] text-muted-foreground">
            {t(
              `Zvolte nové heslo pro ${user?.email ?? ""}. Pak budete rovnou přihlášeni.`,
              `Choose a new password for ${user?.email ?? ""}. You'll stay signed in.`,
            )}
          </p>
          <SetPasswordForm
            submitLabel={t("Uložit a pokračovat", "Save and continue")}
            onDone={afterNewPassword}
          />
        </div>
      ) : sent ? (
        <p className="mt-4 rounded-2xl bg-ok-soft p-3 font-semibold text-ok">
          {t(
            "Pokud účet existuje, poslali jsme odkaz na e-mail.",
            "If the account exists, we emailed a reset link.",
          )}
        </p>
      ) : (
        <div className="mt-6 space-y-3">
          {failed && (
            <p
              role="alert"
              className="rounded-2xl bg-destructive-soft p-3 font-semibold text-destructive"
            >
              {t(
                "Odkaz se nepodařilo odeslat. Zkontrolujte e-mail a zkuste to znovu za pár minut.",
                "The link could not be sent. Check the email address and try again in a few minutes.",
              )}
            </p>
          )}
          <p className="text-[16px] text-muted-foreground">
            {t(
              "Pošleme vám odkaz. Po kliknutí si zvolíte nové heslo. Funguje i pro účty založené přes Google, které heslo zatím nemají.",
              "We'll email you a link. After clicking it you choose a new password. This also works for accounts made with Google that have no password yet.",
            )}
          </p>
          <form
            className="space-y-3"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (!busy && email) void send();
            }}
          >
            <input
              className="field w-full"
              type="email"
              placeholder={t("E-mail", "Email")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            <Button
              variant="fresh"
              size="fresh"
              className="btn-primary w-full"
              type="submit"
              disabled={busy || !email}
            >
              {t("Poslat odkaz", "Send link")}
            </Button>
          </form>
        </div>
      )}
      {!choosing && (
        <Link
          to="/auth"
          onClick={() => clearRecovery()}
          className="mt-4 inline-flex min-h-11 items-center justify-center text-center text-[16px] font-semibold text-primary"
        >
          {t("Zpět na přihlášení", "Back to sign in")}
        </Link>
      )}
    </main>
  );
}

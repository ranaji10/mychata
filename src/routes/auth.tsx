import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LogIn } from "lucide-react";
import { useEffect, useState } from "react";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { LanguageToggle, useLang } from "@/lib/i18n";
import chataImg from "@/assets/chata.jpg";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [
    { title: "Sign in — My Chata" }, { name: "description", content: "Secure sign in to your My Chata account." },
    { property: "og:title", content: "Sign in — My Chata" }, { property: "og:description", content: "Secure sign in to your My Chata account." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: AuthPage,
});

function AuthPage() {
  const { t } = useLang(); const navigate = useNavigate(); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  useEffect(() => { supabase.auth.getUser().then(({ data }) => { if (data.user) navigate({ to: "/domu", replace: true }); }); }, [navigate]);
  const signIn = async () => { setBusy(true); setError(""); const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" }); if (result.error) { setError(t("Přihlášení se nezdařilo.", "Sign-in failed.")); setBusy(false); } };
  return <main className="mx-auto flex min-h-screen max-w-[420px] flex-col bg-background p-4"><div className="flex justify-end"><LanguageToggle /></div><img src={chataImg} alt={t("Dřevěná chata", "Wooden cottage")} className="mt-4 aspect-[16/10] w-full rounded-3xl object-cover" /><section className="py-8"><p className="font-bold text-primary">My Chata</p><h1 className="mt-1 text-3xl font-bold">{t("Přihlaste se ke své chatě", "Sign in to your cottage")}</h1><p className="mt-2 text-muted-foreground">{t("Vaše pobyty, úkoly, výdaje a dokumenty zůstávají soukromé.", "Your stays, tasks, expenses, and documents stay private.")}</p>{error && <p className="mt-4 rounded-2xl bg-primary-soft p-3 font-semibold text-primary">{error}</p>}<button onClick={signIn} disabled={busy} className="btn-primary mt-6 w-full"><LogIn className="size-5" />{busy ? t("Přihlašuji…", "Signing in…") : t("Pokračovat přes Google", "Continue with Google")}</button></section></main>;
}
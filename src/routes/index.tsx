import { createFileRoute } from "@tanstack/react-router";
import { Home, LogIn } from "lucide-react";
import { useAccount } from "@/lib/account";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import { LanguageToggle, useLang } from "@/lib/i18n";
import { useDefaultChataPhoto } from "@/lib/season";
import { startTarget } from "@/lib/start-target";

export const Route = createFileRoute("/")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "My Chata — správa sdílené chaty" },
      {
        name: "description",
        content: "Kalendář pobytů, úkoly, výdaje a předání chaty pro rodiny i organizace.",
      },
      { property: "og:title", content: "My Chata — správa sdílené chaty" },
      {
        property: "og:description",
        content: "Kalendář pobytů, úkoly, výdaje a předání chaty pro rodiny i organizace.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { account, user, loading, needsOnboarding } = useAccount();
  const defaultPhoto = useDefaultChataPhoto();
  const { t } = useLang();
  const navigate = useNavigate();

  // Every finished state leads somewhere (T-051). A signed-in person with no readable account
  // (no membership yet, or the read failed) used to stay on this screen for good, refresh or not:
  // the app pages already send them to onboarding or show "Try again", so go there.
  useEffect(() => {
    const to = startTarget({
      hasAccount: !!account,
      loading,
      signedIn: !!user,
      needsOnboarding,
    });
    if (to) navigate({ to, replace: true });
  }, [account, loading, user, needsOnboarding, navigate]);

  // If the sign-in itself never answers (a stuck saved session in this browser), offer a way out
  // instead of a screen that waits forever.
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setSlow(true), 10000);
    return () => window.clearTimeout(id);
  }, []);
  const signInAgain = async () => {
    // Clear the saved session first: if it is what hangs, signOut() can hang on it too.
    try {
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith("sb-") && key.includes("auth-token")) localStorage.removeItem(key);
      }
    } catch {
      /* storage blocked: the sign-out below is all we can do */
    }
    const result = await Promise.race([
      supabase.auth.signOut({ scope: "local" }),
      new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 3000)),
    ]);
    if (result === null) console.error("[start] sign out did not answer in 3 s");
    else if (result.error) console.error("[start] sign out", result.error.message);
    window.location.assign("/auth");
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[420px] md:max-w-[720px] flex-col page-fresh px-5 pb-8">
      <div className="mt-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid size-10 place-items-center rounded-[12px] bg-primary text-primary-foreground">
            <Home className="size-6" />
          </span>
          <span className="text-lg font-extrabold">My Chata</span>
        </div>
        <LanguageToggle />
      </div>
      <div className="relative mt-3 overflow-hidden rounded-[28px]">
        <img
          src={defaultPhoto.src}
          srcSet={defaultPhoto.srcSet}
          sizes={defaultPhoto.sizes}
          alt={defaultPhoto.alt}
          className="aspect-[16/10] w-full object-cover object-[50%_42%]"
          fetchPriority="high"
          width={1200}
          height={1200}
        />
        <div className="absolute bottom-3 left-3 right-3 rounded-2xl bg-card/95 px-4 py-3 ring-1 ring-border">
          <p className="text-[16px] font-semibold text-muted-foreground">
            {t("Vítejte v aplikaci", "Welcome to")}
          </p>
          <p className="text-lg font-bold leading-tight">My Chata</p>
        </div>
      </div>

      <h1 className="mt-6 text-[28px] font-extrabold leading-[1.15]">
        {t("Otevírám vaši chatu", "Opening your cottage")}
      </h1>
      <p className="mt-1 text-[16px] text-muted-foreground">
        {t("Bezpečně načítám váš účet.", "Securely loading your account.")}
      </p>
      <LogIn className="mt-5 size-8 text-primary" aria-hidden="true" />
      {slow && (
        <div role="status" className="mt-6">
          <p className="text-[16px]">
            {t("Načítání trvá déle než obvykle.", "This is taking longer than usual.")}
          </p>
          <div className="mt-3 flex flex-col gap-3">
            <Button variant="fresh" size="fresh" onClick={() => window.location.reload()}>
              {t("Zkusit znovu", "Try again")}
            </Button>
            <Button variant="outline" size="fresh" onClick={() => void signInAgain()}>
              {t("Přihlásit se znovu", "Sign in again")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

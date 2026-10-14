import { Button } from "@/components/ui/button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Home, LogIn } from "lucide-react";
import { useAccount } from "@/lib/account";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { LanguageToggle, useLang } from "@/lib/i18n";
import { useDefaultChataPhoto } from "@/lib/season";

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
  const { account, user, loading } = useAccount();
  const defaultPhoto = useDefaultChataPhoto();
  const { t } = useLang();
  const navigate = useNavigate();

  useEffect(() => {
    if (account) navigate({ to: "/domu", replace: true });
    else if (!loading && !user) navigate({ to: "/auth", replace: true });
  }, [account, loading, user, navigate]);

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
      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild variant="fresh" size="fresh" className="btn-primary">
          <Link to="/auth">
            <LogIn className="size-5" />
            {t("Přihlásit se", "Sign in")}
          </Link>
        </Button>
        <Button asChild variant="fresh" size="fresh" className="btn-secondary">
          <Link to="/reset-password">{t("Obnovení hesla", "Reset password")}</Link>
        </Button>
      </div>
    </div>
  );
}

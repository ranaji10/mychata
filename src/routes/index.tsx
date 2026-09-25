import { createFileRoute, Link } from "@tanstack/react-router";
import { LogIn } from "lucide-react";
import { useAccount } from "@/lib/account";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { LanguageToggle, useLang } from "@/lib/i18n";
import chataImg from "@/assets/chata.jpg";

export const Route = createFileRoute("/")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "My Chata — shared cottage management" },
      {
        name: "description",
        content:
          "Pick an account and manage your cottage: calendar, tasks, expenses and stay requests.",
      },
      { property: "og:title", content: "My Chata — shared cottage management" },
      {
        property: "og:description",
        content:
          "Pick an account and manage your cottage: calendar, tasks, expenses and stay requests.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { account, user, loading } = useAccount();
  const { t } = useLang();
  const navigate = useNavigate();

  useEffect(() => {
    if (account) navigate({ to: "/domu", replace: true });
    else if (!loading && !user) navigate({ to: "/auth", replace: true });
  }, [account, loading, user, navigate]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[420px] flex-col bg-background px-4 pb-8">
      <div className="mt-4 flex justify-end">
        <LanguageToggle />
      </div>
      <div className="relative mt-3 overflow-hidden rounded-3xl">
        <img
          src={chataImg}
          alt={t("Dřevěná chata v přírodě", "Wooden cottage in nature")}
          className="aspect-[16/10] w-full object-cover"
          width={1024}
          height={640}
        />
        <div className="absolute bottom-3 left-3 right-3 rounded-2xl bg-card/95 px-4 py-3 ring-1 ring-black/5">
          <p className="text-[13px] font-semibold text-muted-foreground">
            {t("Vítejte v aplikaci", "Welcome to")}
          </p>
          <p className="text-lg font-bold leading-tight">My Chata</p>
        </div>
      </div>

      <h1 className="mt-6 text-2xl font-bold">
        {t("Otevírám vaši chatu", "Opening your cottage")}
      </h1>
      <p className="mt-1 text-[15px] text-muted-foreground">
        {t("Bezpečně načítám váš účet.", "Securely loading your account.")}
      </p>
      <LogIn className="mt-5 size-8 text-primary" />

      <div className="mt-auto pt-8 text-center text-[13px] text-muted-foreground">
        <Link
          to="/verejne/zadost"
          className="font-semibold text-primary underline underline-offset-2"
        >
          {t("Veřejný formulář žádosti o pobyt", "Public stay request form")}
        </Link>
      </div>
    </div>
  );
}

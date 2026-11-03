import { Button } from "@/components/ui/button";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/bits";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/account";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/chata/nova")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Přidat chatu — My Chata" },
      { name: "robots", content: "noindex" },
      { name: "description", content: "Add another shared cottage to your account." },
      { property: "og:title", content: "Přidat chatu — My Chata" },
      { property: "og:description", content: "Add another shared cottage to your account." },
    ],
  }),
  component: AddPropertyPage,
});

function AddPropertyPage() {
  const { t } = useLang();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setActivePropertyId, currentMember, account } = useAccount();
  const isAdmin = currentMember?.role === "ADMIN" || currentMember?.role === "OWNER";
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc("add_property", {
      _name: name.trim(),
    });
    setBusy(false);
    if (error) {
      toast.error(
        error.code === "42501"
          ? t(
              "Chatu do tohoto účtu může přidat jen správce.",
              "Only an admin can add a cottage to this account.",
            )
          : t("Přidání se nepodařilo.", "Could not add the cottage."),
      );
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["properties"] });
    if (data) setActivePropertyId(data as string);
    toast.success(t("Chata přidána — jste jejím správcem.", "Cottage added — you are its admin."));
    navigate({ to: "/chaty" });
  };

  return (
    <AppShell>
      <PageHeader
        title={t("Přidat chatu", "Add a cottage")}
        subtitle={t(
          "Kdo chatu přidá, stává se jejím správcem.",
          "Whoever adds a cottage becomes its admin.",
        )}
        back="/chaty"
      />
      {!isAdmin && (
        <div className="card mt-4 space-y-3 p-4">
          <p className="text-[16px]">
            {t(
              `Do účtu „${account?.name ?? ""}“ může chaty přidávat jen správce. Požádejte správce, nebo si založte vlastní účet pro svou chatu.`,
              `Only an admin can add cottages to "${account?.name ?? ""}". Ask an admin, or create your own account for your cottage.`,
            )}
          </p>
          <Link to="/onboarding" search={{ fresh: true }} className="btn-primary w-full">
            {t("Založit vlastní účet", "Create my own account")}
          </Link>
        </div>
      )}
      <div className={`mt-4 space-y-3 ${isAdmin ? "" : "hidden"}`}>
        <label className="block">
          <span className="label-text text-[16px]">
            {t("Jak se vaše chata jmenuje?", "What's your chata called?")}
          </span>
          <input className="field w-full" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <Button
          variant="fresh"
          size="fresh"
          className="btn-primary w-full"
          disabled={busy || !name.trim()}
          onClick={save}
        >
          {busy ? t("Ukládám…", "Saving…") : t("Přidat chatu", "Add cottage")}
        </Button>
      </div>
    </AppShell>
  );
}

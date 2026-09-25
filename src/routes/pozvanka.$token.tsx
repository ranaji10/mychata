import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LanguageToggle, useLang } from "@/lib/i18n";

export const Route = createFileRoute("/pozvanka/$token")({
  staticData: { sitemap: false },
  head: () => ({ meta: [{ title: "Invitation — My Chata" }, { name: "robots", content: "noindex" }] }),
  component: InvitePage,
});

function InvitePage() {
  const { token } = Route.useParams();
  const { t } = useLang();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [state, setState] = useState<"checking" | "accepting" | "done" | "error">("checking");
  const [message, setMessage] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        navigate({ to: "/auth", replace: true });
        return;
      }
      setState("accepting");
      supabase
        .rpc("accept_invitation", { _token: token })
        .then(({ error }) => {
          if (error) {
            setState("error");
            setMessage(t("Pozvánka je neplatná, expirovaná, nebo patří jinému e-mailu.", "This invitation is invalid, expired, or belongs to a different email."));
          } else {
            setState("done");
            queryClient.clear();
            setTimeout(() => navigate({ to: "/domu", replace: true }), 1200);
          }
        });
    });
  }, [token, navigate, queryClient, t]);

  return (
    <main className="mx-auto flex min-h-screen max-w-[420px] flex-col items-center justify-center bg-background p-4 text-center">
      <div className="absolute right-4 top-4">
        <LanguageToggle />
      </div>
      <h1 className="text-2xl font-bold">
        {state === "done" ? t("Vítejte v chatě!", "Welcome to the cottage!") : state === "error" ? t("Pozvánka nefunguje", "Invitation not valid") : t("Přijímám pozvánku…", "Accepting invitation…")}
      </h1>
      {message && <p className="mt-3 rounded-2xl bg-primary-soft p-3 font-semibold text-primary">{message}</p>}
    </main>
  );
}

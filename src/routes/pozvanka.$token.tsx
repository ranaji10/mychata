import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Home, LogIn, LogOut, ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LanguageToggle, useLang } from "@/lib/i18n";
import {
  clearPendingInvite,
  inviteErrorKind,
  savePendingInvite,
  type InviteErrorKind,
} from "@/lib/pending-invite";

export const Route = createFileRoute("/pozvanka/$token")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [{ title: "Invitation — My Chata" }, { name: "robots", content: "noindex" }],
  }),
  component: InvitePage,
});

interface Preview {
  state: string;
  account_name: string | null;
  property_name: string | null;
  role: string | null;
  invited_by: string | null;
  email_hint: string | null;
  email_matches: boolean | null;
}

// Before 28 Sep this page accepted silently, sent signed-out people to /auth and lost the link,
// and showed "Welcome" even for expired links (B-012, B-013). Now it shows what the invitation
// is for and lets the person accept, sign in, or switch account.
function InvitePage() {
  const { token } = Route.useParams();
  const { t } = useLang();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [userEmail, setUserEmail] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<InviteErrorKind | null>(null);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? null));
  }, []);

  const { data: preview, isLoading } = useQuery({
    queryKey: ["invitation-preview", token, userEmail],
    enabled: userEmail !== undefined,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("invitation_preview", { _token: token });
      if (error) throw error;
      return ((data ?? [])[0] ?? { state: "not_found" }) as Preview;
    },
  });

  const signIn = () => {
    savePendingInvite(token);
    navigate({ to: "/auth" });
  };

  const switchAccount = async () => {
    savePendingInvite(token);
    await supabase.auth.signOut();
    queryClient.clear();
    navigate({ to: "/auth" });
  };

  const accept = async () => {
    setBusy(true);
    setFailure(null);
    const { error } = await supabase.rpc("accept_invitation", { _token: token });
    setBusy(false);
    if (error) {
      console.error("[pozvanka] accept", error);
      setFailure(inviteErrorKind(error.message));
      return;
    }
    clearPendingInvite();
    setAccepted(true);
    queryClient.clear();
    setTimeout(() => navigate({ to: "/domu", replace: true }), 1200);
  };

  const state = failure ?? preview?.state;
  const roleLabel =
    preview?.role === "ADMIN" || preview?.role === "OWNER"
      ? t("správce", "admin")
      : t("člen", "member");

  let body: ReactNode;
  if (isLoading || userEmail === undefined) {
    body = <p className="mt-3 text-muted-foreground">{t("Načítám pozvánku…", "Loading…")}</p>;
  } else if (accepted) {
    body = (
      <p className="mt-3 rounded-2xl bg-ok-soft p-3 font-semibold text-ok">
        {t("Hotovo, jste členem. Otevírám chatu…", "Done, you're in. Opening the cottage…")}
      </p>
    );
  } else if (state === "not_found" || state === "unknown") {
    body = (
      <Explain>
        {t(
          "Tento odkaz na pozvánku neznáme. Zkontrolujte, že je celý, nebo požádejte o nový.",
          "We don't recognise this invitation link. Check it's complete, or ask for a new one.",
        )}
      </Explain>
    );
  } else if (state === "expired") {
    body = (
      <Explain>
        {t(
          "Platnost pozvánky vypršela (platí 7 dní). Požádejte správce o novou.",
          "This invitation has expired (they last 7 days). Ask the admin for a new one.",
        )}
      </Explain>
    );
  } else if (state === "used") {
    body = (
      <Explain>
        {t(
          "Tato pozvánka už byla použita. Pokud jste to byli vy, přihlaste se a chatu najdete v přehledu.",
          "This invitation has already been used. If that was you, sign in and the cottage is there.",
        )}
      </Explain>
    );
  } else {
    // valid, or an accept attempt failed with email_mismatch / sign_in
    const needsSignIn = userEmail === null || state === "sign_in";
    const wrongAccount =
      !needsSignIn && (state === "email_mismatch" || preview?.email_matches === false);
    body = (
      <>
        <div className="card mt-4 space-y-2 p-4 text-left">
          <Row icon={<Home className="size-5 text-primary" />}>
            <b>{preview?.property_name ?? preview?.account_name}</b>
            {preview?.property_name && preview.account_name && (
              <span className="text-muted-foreground"> · {preview.account_name}</span>
            )}
          </Row>
          <Row icon={<ShieldCheck className="size-5 text-primary" />}>
            {t(`Role: ${roleLabel}`, `Role: ${roleLabel}`)}
          </Row>
          {preview?.invited_by && (
            <Row icon={<UserRound className="size-5 text-primary" />}>
              {t(`Zve vás ${preview.invited_by}`, `Invited by ${preview.invited_by}`)}
            </Row>
          )}
          {preview?.email_hint && (
            <p className="text-[14px] text-muted-foreground">
              {t(
                `Pozvánka je pro ${preview.email_hint}.`,
                `This invitation is for ${preview.email_hint}.`,
              )}
            </p>
          )}
        </div>

        {needsSignIn ? (
          <>
            <p className="mt-4 text-muted-foreground">
              {t(
                "Přihlaste se nebo si vytvořte účet. Pak se sem vrátíte a pozvánku přijmete.",
                "Sign in or create an account. You'll come back here to accept.",
              )}
            </p>
            <button className="btn-primary mt-3 w-full" onClick={signIn}>
              <LogIn className="size-5" />
              {t("Přihlásit se a přijmout", "Sign in to accept")}
            </button>
          </>
        ) : wrongAccount ? (
          <>
            <Explain>
              {t(
                `Jste přihlášeni jako ${userEmail}, ale pozvánka je pro ${preview?.email_hint ?? "jiný e-mail"}.`,
                `You're signed in as ${userEmail}, but this invitation is for ${preview?.email_hint ?? "another email"}.`,
              )}
            </Explain>
            <button className="btn-primary mt-3 w-full" onClick={switchAccount}>
              <LogOut className="size-5" />
              {t("Odhlásit a přihlásit se správným účtem", "Sign out and use the invited account")}
            </button>
            <p className="mt-3 text-[14px] text-muted-foreground">
              {t(
                `Nebo požádejte správce o pozvánku pro ${userEmail}.`,
                `Or ask the admin for an invitation to ${userEmail}.`,
              )}
            </p>
          </>
        ) : (
          <>
            <p className="mt-4 text-muted-foreground">
              {t(`Přihlášeni jako ${userEmail}.`, `Signed in as ${userEmail}.`)}
            </p>
            <button className="btn-primary mt-3 w-full" disabled={busy} onClick={accept}>
              <CheckCircle2 className="size-5" />
              {busy ? t("Přijímám…", "Accepting…") : t("Přijmout pozvánku", "Accept invitation")}
            </button>
          </>
        )}
      </>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-[420px] flex-col justify-center bg-background p-4 text-center">
      <div className="absolute right-4 top-4">
        <LanguageToggle />
      </div>
      <p className="font-bold text-primary">My Chata</p>
      <h1 className="mt-1 text-2xl font-bold">
        {accepted
          ? t("Vítejte v chatě!", "Welcome to the cottage!")
          : t("Pozvánka do chaty", "Invitation to a cottage")}
      </h1>
      {body}
    </main>
  );
}

function Explain({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 rounded-2xl bg-primary-soft p-3 text-left font-semibold text-primary">
      {children}
    </p>
  );
}

function Row({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-[16px]">
      {icon}
      <span className="min-w-0">{children}</span>
    </p>
  );
}

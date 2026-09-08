import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/account";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { Account } from "@/lib/data";
import chataImg from "@/assets/chata.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "My Chata — správa sdílené chaty" },
      { name: "description", content: "Vyberte účet a spravujte chatu: kalendář, úkoly, výdaje i žádosti o pobyt." },
      { property: "og:title", content: "My Chata — správa sdílené chaty" },
      { property: "og:description", content: "Vyberte účet a spravujte chatu: kalendář, úkoly, výdaje i žádosti o pobyt." },
    ],
  }),
  component: Index,
});

function Index() {
  const { selectAccount, account } = useAccount();
  const navigate = useNavigate();

  const { data: accounts } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("accounts").select("*").order("created_at");
      if (error) throw error;
      return data as Account[];
    },
  });

  // If an account was previously chosen, go straight to the dashboard.
  useEffect(() => {
    if (account) navigate({ to: "/domu", replace: true });
  }, [account, navigate]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[420px] flex-col bg-background px-4 pb-8">
      <div className="relative mt-4 overflow-hidden rounded-3xl">
        <img src={chataImg} alt="Dřevěná chata v přírodě" className="aspect-[16/10] w-full object-cover" width={1024} height={640} />
        <div className="absolute bottom-3 left-3 right-3 rounded-2xl bg-card/95 px-4 py-3 ring-1 ring-black/5">
          <p className="text-[13px] font-semibold text-muted-foreground">Vítejte v aplikaci</p>
          <p className="text-lg font-bold leading-tight">My Chata</p>
        </div>
      </div>

      <h1 className="mt-6 text-2xl font-bold">Vyberte účet</h1>
      <p className="mt-1 text-[15px] text-muted-foreground">
        Pokračujte do své chaty. Všechna data jsou připravena.
      </p>

      <div className="mt-5 space-y-3">
        {accounts?.map((a) => (
          <button
            key={a.id}
            onClick={() => {
              selectAccount(a.id);
              navigate({ to: "/domu" });
            }}
            className="card flex w-full items-center gap-4 p-4 text-left active:scale-[0.99]"
          >
            <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
              {a.type === "FAMILY" ? <Users className="size-6" /> : <Building2 className="size-6" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-bold">{a.name}</p>
              <p className="text-[14px] text-muted-foreground">
                {a.type === "FAMILY" ? "Rodinný účet" : "Firemní / organizační účet"}
              </p>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-auto pt-8 text-center text-[13px] text-muted-foreground">
        <Link to="/verejne/zadost" className="font-semibold text-primary underline underline-offset-2">
          Veřejný formulář žádosti o pobyt
        </Link>
      </div>
    </div>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, User } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { PillDanger, PillNeutral, PillOk, Skeleton } from "@/components/bits";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/account";
import { useLang } from "@/lib/i18n";
import { fmtDate, taskCategoryLabel, todayISO, urgencyLabel, type Task } from "@/lib/data";

export const Route = createFileRoute("/ukoly/$id")({
  head: () => ({
    meta: [
      { title: "Task detail — My Chata" },
      { name: "description", content: "Details of a cottage task." },
      { property: "og:title", content: "Task detail — My Chata" },
      { property: "og:description", content: "Details of a cottage task." },
    ],
  }),
  component: TaskDetail,
});

function TaskDetail() {
  const { id } = Route.useParams();
  const { property, members } = useAccount();
  const { t, lang } = useLang();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: task, isLoading } = useQuery({
    queryKey: ["task", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("*").eq("id", id).single();
      if (error) throw error;
      return data as Task;
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["task", id] });
    queryClient.invalidateQueries({ queryKey: ["tasks", property?.id] });
  };

  const update = useMutation({
    mutationFn: async (patch: { assignee_member_id?: string | null; due_date?: string | null; status?: "OPEN" | "DONE" }) => {
      const { error } = await supabase.from("tasks").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: () => toast.error(t("Změnu se nepodařilo uložit.", "Could not save the change.")),
  });

  if (isLoading || !task) {
    return (
      <AppShell>
        <Skeleton className="h-48" />
      </AppShell>
    );
  }

  const done = task.status === "DONE";
  const overdue = !done && task.due_date && task.due_date < todayISO();

  return (
    <AppShell>
      <div className="flex items-center gap-2">
        <button onClick={() => navigate({ to: "/ukoly" })} aria-label={t("Zpět", "Back")} className="grid size-11 place-items-center rounded-xl bg-secondary">
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="text-2xl font-bold">{t("Detail úkolu", "Task detail")}</h1>
      </div>

      <section className="card mt-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-xl font-bold leading-snug">{task.title}</h2>
          {done ? (
            <PillOk>{t("Hotovo", "Done")}</PillOk>
          ) : overdue ? (
            <PillDanger>{t("Po termínu", "Overdue")}</PillDanger>
          ) : (
            <PillNeutral>{t("Otevřené", "Open")}</PillNeutral>
          )}
        </div>

        <p className="mt-1 text-[14px] font-semibold text-muted-foreground">
          {taskCategoryLabel(task.category, lang)} · {t("Priorita", "Priority")}: {urgencyLabel(task.urgency, lang)}
        </p>

        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-muted-foreground">
              <User className="size-5" />
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-muted-foreground">{t("Odpovědná osoba", "Assignee")}</p>
              <select
                value={task.assignee_member_id ?? ""}
                onChange={(e) => update.mutate({ assignee_member_id: e.target.value || null })}
                className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-[15px] font-semibold"
                aria-label={t("Přiřadit osobu", "Assign person")}
              >
                <option value="">{t("Nikdo", "Nobody")}</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-muted-foreground">
              <CalendarDays className="size-5" />
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-muted-foreground">{t("Termín", "Due date")}</p>
              <input
                type="date"
                value={task.due_date ?? ""}
                onChange={(e) => update.mutate({ due_date: e.target.value || null })}
                className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-[15px] font-semibold"
                aria-label={t("Termín", "Due date")}
              />
            </div>
          </div>
        </div>

        {task.done_note && (
          <p className="mt-3 rounded-2xl bg-background p-3 text-[14px]">{t("Poznámka", "Note")}: „{task.done_note}“</p>
        )}
      </section>

      <button
        onClick={() => update.mutate({ status: done ? "OPEN" : "DONE" })}
        className={`mt-4 w-full ${done ? "btn-secondary" : "btn-primary"}`}
      >
        {done ? t("Znovu otevřít", "Reopen") : t("Označit jako hotové", "Mark as done")}
      </button>
    </AppShell>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Circle, Plus, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { EmptyState, LoadingCards, PageHeader, PillDanger, PillNeutral } from "@/components/bits";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/account";
import { useLang } from "@/lib/i18n";
import { fmtDate, seasonalTemplates, taskCategoryLabel, todayISO, type Task } from "@/lib/data";

export const Route = createFileRoute("/ukoly")({
  head: () => ({
    meta: [
      { title: "Tasks — My Chata" },
      { name: "description", content: "Tasks and seasonal checklists for your cottage." },
      { property: "og:title", content: "Tasks — My Chata" },
      { property: "og:description", content: "Tasks and seasonal checklists for your cottage." },
    ],
  }),
  component: TasksPage,
});

type Filter = "all" | "mine" | "overdue" | "seasonal";

function TasksPage() {
  const { property, currentMember, members } = useAccount();
  const { t, lang } = useLang();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>("all");
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState<string>("");
  const [due, setDue] = useState(todayISO());
  const [showForm, setShowForm] = useState(false);

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "all", label: t("Vše", "All") },
    { key: "mine", label: t("Moje", "Mine") },
    { key: "overdue", label: t("Po termínu", "Overdue") },
    { key: "seasonal", label: t("Sezónní", "Seasonal") },
  ];

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["tasks", property?.id],
    enabled: !!property,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("property_id", property!.id)
        .order("due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data as Task[];
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["tasks", property?.id] });

  const toggle = useMutation({
    mutationFn: async (t: Task) => {
      const { error } = await supabase
        .from("tasks")
        .update({ status: t.status === "DONE" ? "OPEN" : "DONE" })
        .eq("id", t.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: () => toast.error(t("Úkol se nepodařilo změnit.", "Could not update the task.")),
  });

  const addTask = async () => {
    if (!property || !currentMember || !title.trim()) return;
    const { error } = await supabase.from("tasks").insert({
      property_id: property.id,
      title: title.trim(),
      category: "other",
      urgency: "LOW",
      assignee_member_id: assignee || null,
      due_date: due,
      status: "OPEN",
      created_by: currentMember.name,
    });
    if (error) {
      toast.error(t("Úkol se nepodařilo přidat.", "Could not add the task."));
      return;
    }
    toast.success(t("Úkol přidán.", "Task added."));
    setTitle("");
    setShowForm(false);
    invalidate();
  };

  const addChecklist = async (templateId: string) => {
    if (!property || !currentMember) return;
    const template = seasonalTemplates(lang).find((tpl) => tpl.id === templateId);
    if (!template) return;
    const { error } = await supabase.from("tasks").insert(
      template.tasks.map((title) => ({
        property_id: property.id,
        title,
        category: "seasonal" as const,
        urgency: "LOW" as const,
        status: "OPEN" as const,
        created_by: currentMember.name,
      })),
    );
    if (error) {
      toast.error(t("Seznam se nepodařilo přidat.", "Could not add the checklist."));
      return;
    }
    toast.success(
      t(
        `Přidán seznam „${template.title}“ (${template.tasks.length} úkolů).`,
        `Added checklist "${template.title}" (${template.tasks.length} tasks).`,
      ),
    );
    invalidate();
  };

  const today = todayISO();
  const filtered = (tasks ?? []).filter((t) => {
    if (filter === "mine") return t.assignee_member_id === currentMember?.id;
    if (filter === "overdue") return t.status !== "DONE" && t.due_date && t.due_date < today;
    if (filter === "seasonal") return t.category === "seasonal";
    return true;
  });

  const memberName = (id: string | null) => members.find((m) => m.id === id)?.name;

  return (
    <AppShell>
      <PageHeader title={t("Úkoly", "Tasks")} subtitle={t("Co je potřeba na chatě udělat.", "What needs doing at the cottage.")} />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`h-11 shrink-0 rounded-full px-4 text-[14px] font-bold ${
              filter === f.key ? "bg-primary text-primary-foreground" : "bg-card text-foreground ring-1 ring-black/5"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <LoadingCards />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title={t("Žádné úkoly v tomto filtru.", "No tasks in this filter.")}
          hint={t("Přidejte nový úkol nebo sezónní seznam.", "Add a new task or a seasonal checklist.")}
        />
      ) : (
        <div className="mt-2 space-y-2.5">
          {filtered.map((task) => {
            const overdue = task.status !== "DONE" && task.due_date && task.due_date < today;
            return (
              <div key={task.id} className="card flex items-center gap-3 p-3">
                <button
                  onClick={() => toggle.mutate(task)}
                  aria-label={task.status === "DONE" ? t("Označit jako nesplněné", "Mark as not done") : t("Označit jako hotové", "Mark as done")}
                  className="grid size-11 shrink-0 place-items-center"
                >
                  {task.status === "DONE" ? (
                    <CheckCircle2 className="size-7 text-ok" />
                  ) : (
                    <Circle className="size-7 text-muted-foreground" />
                  )}
                </button>
                <Link to="/ukoly/$id" params={{ id: task.id }} className="min-w-0 flex-1">
                  <p className={`truncate text-[15px] font-bold ${task.status === "DONE" ? "text-muted-foreground line-through" : ""}`}>
                    {task.title}
                  </p>
                  <p className="text-[13px] text-muted-foreground">
                    {memberName(task.assignee_member_id) ?? t("Nepřiřazeno", "Unassigned")}
                    {task.due_date ? ` · ${fmtDate(task.due_date)}` : ""} · {taskCategoryLabel(task.category, lang)}
                  </p>
                </Link>
                {task.status === "DONE" ? (
                  <PillNeutral>{t("Hotovo", "Done")}</PillNeutral>
                ) : overdue ? (
                  <PillDanger>{t("Po termínu", "Overdue")}</PillDanger>
                ) : null}
              </div>
            );
          })}

        </div>
      )}

      {showForm ? (
        <section className="card mt-4 space-y-3 p-4">
          <h3 className="text-lg font-bold">{t("Nový úkol", "New task")}</h3>
          <div>
            <label htmlFor="task-title" className="mb-1 block text-[13px] font-bold">{t("Název", "Title")}</label>
            <input id="task-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("Např. Koupit plyn", "E.g. Buy gas")} className="field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="task-assignee" className="mb-1 block text-[13px] font-bold">{t("Odpovědná osoba", "Assignee")}</label>
              <select id="task-assignee" value={assignee} onChange={(e) => setAssignee(e.target.value)} className="field">
                <option value="">{t("Nikdo", "Nobody")}</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="task-due" className="mb-1 block text-[13px] font-bold">{t("Termín", "Due date")}</label>
              <input id="task-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} className="field" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={addTask} disabled={!title.trim()} className="btn-primary flex-1 disabled:opacity-40">{t("Přidat úkol", "Add task")}</button>
            <button onClick={() => setShowForm(false)} className="btn-secondary">{t("Zrušit", "Cancel")}</button>
          </div>
        </section>
      ) : (
        <button onClick={() => setShowForm(true)} className="btn-primary mt-4 w-full">
          <Plus className="size-5" /> {t("Přidat úkol", "Add task")}
        </button>
      )}

      <section className="card mt-4 p-4">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-primary" />
          <h3 className="text-lg font-bold">{t("Sezónní seznamy", "Seasonal checklists")}</h3>
        </div>
        <p className="mt-1 text-[14px] text-muted-foreground">{t("Připravené kontrolní seznamy podle ročního období.", "Ready-made checklists for the season.")}</p>
        <div className="mt-3 space-y-2">
          {seasonalTemplates(lang).map((tpl) => (
            <button key={tpl.id} onClick={() => addChecklist(tpl.id)} className="btn-secondary w-full">
              {tpl.title} ({tpl.tasks.length})
            </button>
          ))}
        </div>
      </section>
    </AppShell>
  );
}

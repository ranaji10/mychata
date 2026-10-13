import { createFileRoute, Link, Outlet, useChildMatches } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Plus, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { TaskGroup } from "@/components/TaskGroup";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/AppShell";
import { EmptyState, LoadingCards, PageHeader } from "@/components/bits";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/account";
import { useLang } from "@/lib/i18n";
import { seasonalTemplates, todayISO, type Task } from "@/lib/data";
import { translateTaskText } from "@/lib/task-translation.functions";

export const Route = createFileRoute("/ukoly")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Tasks — My Chata" },
      { name: "description", content: "Tasks and seasonal checklists for your cottage." },
      { property: "og:title", content: "Tasks — My Chata" },
      { property: "og:description", content: "Tasks and seasonal checklists for your cottage." },
    ],
  }),
  component: TasksRoute,
});

type Filter = "all" | "mine" | "overdue" | "seasonal";

// /ukoly/$id (task detail) is a child of this route in the file-based router, so it
// renders inside this component. Without an <Outlet /> the address changed but the list stayed on screen (T-022).
function TasksRoute() {
  const children = useChildMatches();
  return children.length ? <Outlet /> : <TasksPage />;
}

function TasksPage() {
  const { property, currentMember, members } = useAccount();
  const { t, lang } = useLang();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>("all");
  const [title, setTitle] = useState("");
  // Adding waits for the translation, which can take a few seconds; a second tap meanwhile
  // used to create the task (or the whole checklist) twice (T-026).
  const [adding, setAdding] = useState(false);
  // null = not chosen yet: new tasks default to the person adding them (T-019).
  const [assignee, setAssignee] = useState<string | null>(null);
  const chosenAssignee = assignee ?? currentMember?.id ?? "";
  // Ready-made checklist waiting for "who does these?" before it is added (T-019).
  const [pendingTemplate, setPendingTemplate] = useState<string | null>(null);
  // Set when the database says this checklist was already added this season (T-018).
  const [duplicateOf, setDuplicateOf] = useState<string | null>(null);
  const [assignMode, setAssignMode] = useState<"all" | "each">("all");
  const [assignAll, setAssignAll] = useState<string | null>(null);
  const [assignEach, setAssignEach] = useState<Record<number, string>>({});
  const [due, setDue] = useState(todayISO());
  const [showForm, setShowForm] = useState(false);
  const translate = useServerFn(translateTaskText);

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "all", label: t("Vše", "All") },
    { key: "mine", label: t("Moje", "Mine") },
    { key: "overdue", label: t("Po termínu", "Overdue") },
    { key: "seasonal", label: t("Sezónní", "Seasonal") },
  ];

  const {
    data: tasks,
    isLoading,
    isError: tasksError,
    refetch: retryTasks,
    isFetching,
  } = useQuery({
    queryKey: ["tasks", property?.id],
    enabled: !!property,
    queryFn: async () => {
      if (!property) return [];
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("property_id", property.id)
        .order("due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data as Task[];
    },
  });

  const {
    data: checklists,
    isLoading: checklistsLoading,
    error: checklistError,
  } = useQuery({
    queryKey: ["checklists", property?.id],
    enabled: !!property,
    queryFn: async () => {
      if (!property) return [];
      const { data, error } = await supabase
        .from("checklists")
        .select("id, title, created_at")
        .eq("property_id", property.id)
        .order("created_at")
        .order("id");
      if (error) throw error;
      return data;
    },
  });
  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["tasks", property?.id] }),
      queryClient.invalidateQueries({ queryKey: ["checklists", property?.id] }),
    ]);

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
    if (adding || !property || !currentMember || !title.trim()) return;
    setAdding(true);
    try {
      await saveTask();
    } finally {
      setAdding(false);
    }
  };
  const saveTask = async () => {
    if (!property || !currentMember) return;
    const translated = await translate({
      data: { text: title.trim(), sourceLanguage: lang },
    }).catch(() => ({ translation: title.trim() }));
    const { error } = await supabase.from("tasks").insert({
      property_id: property.id,
      title: title.trim(),
      source_language: lang,
      title_cs: lang === "cs" ? title.trim() : translated.translation,
      title_en: lang === "en" ? title.trim() : translated.translation,
      category: "other",
      urgency: "LOW",
      assignee_member_id: chosenAssignee || null,
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
    setAssignee(null);
    setShowForm(false);
    invalidate();
  };

  const addChecklist = async (templateId: string, force = false) => {
    if (adding || !property || !currentMember) return;
    setAdding(true);
    try {
      await saveChecklist(templateId, force);
    } finally {
      setAdding(false);
    }
  };
  const saveChecklist = async (templateId: string, force: boolean) => {
    if (!property || !currentMember) return;
    const template = seasonalTemplates(lang).find((tpl) => tpl.id === templateId);
    const csTemplate = seasonalTemplates("cs").find((tpl) => tpl.id === templateId);
    const enTemplate = seasonalTemplates("en").find((tpl) => tpl.id === templateId);
    if (!template || !csTemplate || !enTemplate) return;
    // One database step creates the checklist and its tasks (T-018). A second copy of the
    // same checklist in the same season needs a confirmation.
    const tasksJson = template.tasks.map((title, index) => ({
      title_cs: csTemplate.tasks[index] ?? title,
      title_en: enTemplate.tasks[index] ?? title,
      assignee:
        (assignMode === "all"
          ? (assignAll ?? currentMember.id)
          : (assignEach[index] ?? currentMember.id)) || null,
    }));
    const scrollY = window.scrollY;
    const { error } = await supabase.rpc("add_checklist", {
      _property_id: property.id,
      _template_id: templateId,
      _title: template.title,
      _lang: lang,
      _tasks: tasksJson,
      _force: force,
    });
    if (error?.message.includes("checklist_exists")) {
      setDuplicateOf(templateId);
      return;
    }
    if (error) {
      console.error("[ukoly] add checklist", error);
      toast.error(t("Seznam se nepodařilo přidat.", "Could not add the checklist."));
      return;
    }
    toast.success(
      t(
        `Přidán seznam „${template.title}“ (${template.tasks.length} úkolů).`,
        `Added checklist "${template.title}" (${template.tasks.length} tasks).`,
      ),
    );
    setPendingTemplate(null);
    setDuplicateOf(null);
    setAssignEach({});
    await invalidate();
    requestAnimationFrame(() =>
      requestAnimationFrame(() => window.scrollTo({ top: scrollY, behavior: "instant" })),
    );
  };

  // Open tasks that came from the same template, so a second tap doesn't silently duplicate.
  const alreadyOpen = (templateId: string) => {
    const cs = seasonalTemplates("cs").find((tpl) => tpl.id === templateId)?.tasks ?? [];
    return (tasks ?? []).filter(
      (task) => task.status !== "DONE" && task.title_cs !== null && cs.includes(task.title_cs),
    ).length;
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
      <PageHeader
        title={t("Úkoly", "Tasks")}
        subtitle={t("Co je potřeba na chatě udělat.", "What needs doing at the cottage.")}
      />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            aria-pressed={filter === f.key}
            onClick={() => setFilter(f.key)}
            className={`h-11 shrink-0 rounded-full px-4 text-[16px] font-bold ${
              filter === f.key
                ? "bg-primary text-primary-foreground"
                : "bg-card text-foreground ring-1 ring-border"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {tasksError ? (
        <div className="mt-4 space-y-3">
          <p role="alert" className="text-[16px] text-destructive">
            {t("Úkoly se nepodařilo načíst.", "Could not load the tasks.")}
          </p>
          <Button
            variant="outline"
            disabled={isFetching}
            onClick={() => void retryTasks()}
            className="min-h-11 text-[16px]"
          >
            {t("Zkusit znovu", "Try again")}
          </Button>
        </div>
      ) : isLoading || checklistsLoading ? (
        <LoadingCards />
      ) : (
        <div className="mt-2 space-y-4">
          {checklistError && (
            <p role="alert" className="text-[16px] text-destructive">
              {t(
                "Seznamy se nepodařilo načíst. Zkuste to znovu.",
                "Could not load the checklists. Please try again.",
              )}
            </p>
          )}
          {filtered.length === 0 && (
            <EmptyState
              icon={CheckCircle2}
              title={t("Žádné úkoly v tomto filtru.", "No tasks in this filter.")}
              hint={t(
                "Přidejte nový úkol nebo sezónní seznam.",
                "Add a new task or a seasonal checklist.",
              )}
            />
          )}
          <TaskGroup
            tasks={filtered.filter(
              (task) =>
                !task.checklist_id ||
                !(checklists ?? []).some((list) => list.id === task.checklist_id),
            )}
            memberName={memberName}
            onToggle={(task) => toggle.mutate(task)}
            busy={toggle.isPending}
          />
          {(checklists ?? [])
            .filter(
              (list) => filter === "all" || filtered.some((task) => task.checklist_id === list.id),
            )
            .map((list) => (
              <TaskGroup
                key={`${filter}-${list.id}`}
                defaultOpen={filter !== "all"}
                title={list.title}
                tasks={filtered.filter((task) => task.checklist_id === list.id)}
                totalTasks={(filter === "all" ? (tasks ?? []) : filtered).filter(
                  (task) => task.checklist_id === list.id,
                )}
                memberName={memberName}
                onToggle={(task) => toggle.mutate(task)}
                busy={toggle.isPending}
              />
            ))}
        </div>
      )}

      {showForm ? (
        <section className="card mt-4 space-y-3 p-4">
          <h3 className="text-lg font-bold">{t("Nový úkol", "New task")}</h3>
          <div>
            <label htmlFor="task-title" className="mb-1 block text-[16px] font-bold">
              {t("Název", "Title")}
            </label>
            <input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("Např. Koupit plyn", "E.g. Buy gas")}
              className="field"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="task-assignee" className="mb-1 block text-[16px] font-bold">
                {t("Odpovědná osoba", "Assignee")}
              </label>
              <select
                id="task-assignee"
                value={chosenAssignee}
                onChange={(e) => setAssignee(e.target.value)}
                className="field"
              >
                <option value="">{t("Nikdo", "Nobody")}</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="task-due" className="mb-1 block text-[16px] font-bold">
                {t("Termín", "Due date")}
              </label>
              <input
                id="task-due"
                type="date"
                value={due}
                onChange={(e) => setDue(e.target.value)}
                className="field"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={addTask}
              disabled={adding || !title.trim()}
              className="btn-primary flex-1 disabled:opacity-40"
            >
              {adding ? t("Ukládám…", "Saving…") : t("Přidat úkol", "Add task")}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-secondary">
              {t("Zrušit", "Cancel")}
            </button>
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
        <p className="mt-1 text-[16px] text-muted-foreground">
          {t(
            "Připravené kontrolní seznamy podle ročního období.",
            "Ready-made checklists for the season.",
          )}
        </p>
        <div className="mt-3 space-y-2">
          {seasonalTemplates(lang).map((tpl) => (
            <div key={tpl.id}>
              <button
                onClick={() => {
                  setPendingTemplate(pendingTemplate === tpl.id ? null : tpl.id);
                  setAssignMode("all");
                  setAssignAll(null);
                  setAssignEach({});
                }}
                className={`btn-secondary w-full ${pendingTemplate === tpl.id ? "ring-2 ring-primary" : ""}`}
              >
                {tpl.title} ({tpl.tasks.length})
              </button>
              {pendingTemplate === tpl.id && (
                <div className="mt-2 space-y-3 rounded-2xl bg-secondary p-3">
                  {alreadyOpen(tpl.id) > 0 && (
                    <p className="text-[16px] font-semibold text-warn">
                      {t(
                        `Z tohoto seznamu už máte ${alreadyOpen(tpl.id)} nesplněných úkolů. Přidat znovu?`,
                        `You already have ${alreadyOpen(tpl.id)} open tasks from this checklist. Add again?`,
                      )}
                    </p>
                  )}
                  <p className="text-[16px] font-bold">{t("Kdo je udělá?", "Who does them?")}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      className={`btn-secondary ${assignMode === "all" ? "ring-2 ring-primary" : ""}`}
                      onClick={() => setAssignMode("all")}
                    >
                      {t("Všechny jeden člověk", "All to one person")}
                    </button>
                    <button
                      className={`btn-secondary ${assignMode === "each" ? "ring-2 ring-primary" : ""}`}
                      onClick={() => setAssignMode("each")}
                    >
                      {t("Každý úkol zvlášť", "Each task separately")}
                    </button>
                  </div>
                  {assignMode === "all" ? (
                    <select
                      className="field"
                      aria-label={t("Odpovědná osoba", "Assignee")}
                      value={assignAll ?? currentMember?.id ?? ""}
                      onChange={(e) => setAssignAll(e.target.value)}
                    >
                      <option value="">{t("Nikdo", "Nobody")}</option>
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <ul className="space-y-2">
                      {tpl.tasks.map((taskTitle, index) => (
                        <li key={taskTitle} className="space-y-1">
                          <p className="text-[16px]">{taskTitle}</p>
                          <select
                            className="field"
                            aria-label={taskTitle}
                            value={assignEach[index] ?? currentMember?.id ?? ""}
                            onChange={(e) =>
                              setAssignEach({ ...assignEach, [index]: e.target.value })
                            }
                          >
                            <option value="">{t("Nikdo", "Nobody")}</option>
                            {members.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name}
                              </option>
                            ))}
                          </select>
                        </li>
                      ))}
                    </ul>
                  )}
                  {duplicateOf === tpl.id && (
                    <p className="rounded-2xl bg-warn-soft p-3 text-[16px] font-semibold text-warn">
                      {t(
                        "Tento seznam už letos máte. Opravdu ho přidat znovu?",
                        "You already added this checklist this season. Add it again anyway?",
                      )}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button
                      className="btn-primary flex-1 disabled:opacity-40"
                      disabled={adding}
                      onClick={() => addChecklist(tpl.id, duplicateOf === tpl.id)}
                    >
                      {duplicateOf === tpl.id
                        ? t("Ano, přidat znovu", "Yes, add again")
                        : t(`Přidat ${tpl.tasks.length} úkolů`, `Add ${tpl.tasks.length} tasks`)}
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => {
                        setPendingTemplate(null);
                        setDuplicateOf(null);
                      }}
                    >
                      {t("Zrušit", "Cancel")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}

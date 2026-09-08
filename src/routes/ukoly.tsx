import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Circle, Plus, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { EmptyState, LoadingCards, PageHeader, PillDanger, PillNeutral } from "@/components/bits";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/account";
import { fmtDate, SEASONAL_TEMPLATES, TASK_CATEGORY, todayISO, type Task } from "@/lib/data";

export const Route = createFileRoute("/ukoly")({
  head: () => ({
    meta: [
      { title: "Úkoly — My Chata" },
      { name: "description", content: "Úkoly a sezónní kontrolní seznamy pro chatu." },
      { property: "og:title", content: "Úkoly — My Chata" },
      { property: "og:description", content: "Úkoly a sezónní kontrolní seznamy pro chatu." },
    ],
  }),
  component: TasksPage,
});

type Filter = "all" | "mine" | "overdue" | "seasonal";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Vše" },
  { key: "mine", label: "Moje" },
  { key: "overdue", label: "Po termínu" },
  { key: "seasonal", label: "Sezónní" },
];

function TasksPage() {
  const { property, currentMember, members } = useAccount();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>("all");
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState<string>("");
  const [due, setDue] = useState(todayISO());
  const [showForm, setShowForm] = useState(false);

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
    onError: () => toast.error("Úkol se nepodařilo změnit."),
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
      toast.error("Úkol se nepodařilo přidat.");
      return;
    }
    toast.success("Úkol přidán.");
    setTitle("");
    setShowForm(false);
    invalidate();
  };

  const addChecklist = async (templateId: string) => {
    if (!property || !currentMember) return;
    const template = SEASONAL_TEMPLATES.find((t) => t.id === templateId);
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
      toast.error("Seznam se nepodařilo přidat.");
      return;
    }
    toast.success(`Přidán seznam „${template.title}“ (${template.tasks.length} úkolů).`);
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
      <PageHeader title="Úkoly" subtitle="Co je potřeba na chatě udělat." />

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
          title="Žádné úkoly v tomto filtru."
          hint="Přidejte nový úkol nebo sezónní seznam."
        />
      ) : (
        <div className="mt-2 space-y-2.5">
          {filtered.map((t) => {
            const overdue = t.status !== "DONE" && t.due_date && t.due_date < today;
            return (
              <div key={t.id} className="card flex items-center gap-3 p-3">
                <button
                  onClick={() => toggle.mutate(t)}
                  aria-label={t.status === "DONE" ? "Označit jako nesplněné" : "Označit jako hotové"}
                  className="grid size-11 shrink-0 place-items-center"
                >
                  {t.status === "DONE" ? (
                    <CheckCircle2 className="size-7 text-ok" />
                  ) : (
                    <Circle className="size-7 text-muted-foreground" />
                  )}
                </button>
                <Link to="/ukoly/$id" params={{ id: t.id }} className="min-w-0 flex-1">
                  <p className={`truncate text-[15px] font-bold ${t.status === "DONE" ? "text-muted-foreground line-through" : ""}`}>
                    {t.title}
                  </p>
                  <p className="text-[13px] text-muted-foreground">
                    {memberName(t.assignee_member_id) ?? "Nepřiřazeno"}
                    {t.due_date ? ` · ${fmtDate(t.due_date)}` : ""} · {TASK_CATEGORY[t.category]}
                  </p>
                </Link>
                {t.status === "DONE" ? <PillNeutral>Hotovo</PillNeutral> : overdue ? <PillDanger>Po termínu</PillDanger> : null}
              </div>
            );
          })}
        </div>
      )}

      {showForm ? (
        <section className="card mt-4 space-y-3 p-4">
          <h3 className="text-lg font-bold">Nový úkol</h3>
          <div>
            <label htmlFor="task-title" className="mb-1 block text-[13px] font-bold">Název</label>
            <input id="task-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Např. Koupit plyn" className="field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="task-assignee" className="mb-1 block text-[13px] font-bold">Odpovědná osoba</label>
              <select id="task-assignee" value={assignee} onChange={(e) => setAssignee(e.target.value)} className="field">
                <option value="">Nikdo</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="task-due" className="mb-1 block text-[13px] font-bold">Termín</label>
              <input id="task-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} className="field" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={addTask} disabled={!title.trim()} className="btn-primary flex-1 disabled:opacity-40">Přidat úkol</button>
            <button onClick={() => setShowForm(false)} className="btn-secondary">Zrušit</button>
          </div>
        </section>
      ) : (
        <button onClick={() => setShowForm(true)} className="btn-primary mt-4 w-full">
          <Plus className="size-5" /> Přidat úkol
        </button>
      )}

      <section className="card mt-4 p-4">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-primary" />
          <h3 className="text-lg font-bold">Sezónní seznamy</h3>
        </div>
        <p className="mt-1 text-[14px] text-muted-foreground">Připravené kontrolní seznamy podle ročního období.</p>
        <div className="mt-3 space-y-2">
          {SEASONAL_TEMPLATES.map((t) => (
            <button key={t.id} onClick={() => addChecklist(t.id)} className="btn-secondary w-full">
              {t.title} ({t.tasks.length})
            </button>
          ))}
        </div>
      </section>
    </AppShell>
  );
}

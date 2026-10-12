import { Link } from "@tanstack/react-router";
import { CheckCircle2, ChevronDown, Circle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { fmtDate, taskCategoryLabel, taskTitle, todayISO, type Task } from "@/lib/data";
import { useLang } from "@/lib/i18n";

export function TaskGroup({ title, tasks, totalTasks = tasks, onToggle, memberName, busy }: {
  title?: string;
  tasks: Task[];
  totalTasks?: Task[];
  onToggle: (task: Task) => void;
  memberName: (id: string | null) => string | undefined;
  busy: boolean;
}) {
  const { t, lang } = useLang();
  const [open, setOpen] = useState(!title);
  const [doneOpen, setDoneOpen] = useState(false);
  const completed = tasks.filter((task) => task.status === "DONE");
  const remaining = tasks.filter((task) => task.status !== "DONE");
  const count = totalTasks.filter((task) => task.status === "DONE").length;
  const tile = (task: Task) => (
    <div key={task.id} className="card relative flex items-center gap-2 p-3">
      <Button variant="ghost" disabled={busy} onClick={() => onToggle(task)} aria-label={t(`${task.status === "DONE" ? "Označit jako nesplněné" : "Označit jako hotové"}: ${taskTitle(task, "cs")}`, `${task.status === "DONE" ? "Mark as not done" : "Mark as done"}: ${taskTitle(task, "en")}`)} className="relative z-10 size-11 shrink-0 p-0 [&_svg]:size-7">
        {task.status === "DONE" ? <CheckCircle2 className="text-ok" /> : <Circle className="text-muted-foreground" />}
      </Button>
      <div className="min-w-0 flex-1 text-[16px]">
        <Link to="/ukoly/$id" params={{ id: task.id }} className={`block font-bold after:absolute after:inset-0 after:rounded-3xl ${task.status === "DONE" ? "text-muted-foreground line-through" : ""}`}>
          {taskTitle(task, lang)}
        </Link>
        <p className="break-words text-muted-foreground">{memberName(task.assignee_member_id) ?? t("Nepřiřazeno", "Unassigned")}{task.due_date ? ` · ${fmtDate(task.due_date)}` : ""} · {taskCategoryLabel(task.category, lang)}</p>
        {task.status !== "DONE" && task.due_date && task.due_date < todayISO() && <p className="font-semibold text-destructive">{t("Po termínu", "Overdue")}</p>}
      </div>
    </div>
  );
  return (
    <section className="min-w-0 space-y-2" aria-label={title ?? t("Samostatné úkoly", "Standalone tasks")}>
      {title && <Button variant="ghost" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="grid h-auto min-h-14 w-full grid-cols-[minmax(0,1fr)_auto] gap-2 whitespace-normal rounded-xl border border-border bg-card p-3 text-left text-[16px]">
        <span className="min-w-0"><span className="block break-words font-bold">{title}</span><span className="block text-muted-foreground">{t(`${count} z ${totalTasks.length} hotovo`, `${count} of ${totalTasks.length} done`)}</span></span>
        <ChevronDown className={`shrink-0 ${open ? "rotate-180" : ""}`} />
      </Button>}
      {open && <div className="space-y-2">
        {remaining.map(tile)}
        {completed.length > 0 && <div>
          <Button variant="ghost" onClick={() => setDoneOpen((value) => !value)} aria-expanded={doneOpen} className="flex min-h-11 w-full justify-between whitespace-normal text-[16px] font-bold">
            <span>{t("Hotovo", "Done")} ({completed.length})</span><ChevronDown className={doneOpen ? "rotate-180" : ""} />
          </Button>
          {doneOpen && <div className="space-y-2">{completed.map(tile)}</div>}
        </div>}
      </div>}
    </section>
  );
}
import { Link } from "@tanstack/react-router";
import { Check, ChevronDown, Circle } from "lucide-react";
import { useState } from "react";
import { PillNeutral } from "@/components/bits";
import { Button } from "@/components/ui/button";
import { fmtDate, taskCategoryLabel, taskTitle, todayISO, type Task } from "@/lib/data";
import { useLang } from "@/lib/i18n";

const OPEN_KEY = "mychata.task-groups-open";

/** Which checklists are open, kept for this tab so Back from a task lands on the same view (bug 8). */
function readOpen(groupId: string | undefined): boolean | null {
  if (!groupId) return null;
  try {
    const all = JSON.parse(sessionStorage.getItem(OPEN_KEY) ?? "{}") as Record<string, boolean>;
    return typeof all[groupId] === "boolean" ? all[groupId] : null;
  } catch {
    return null;
  }
}
function writeOpen(groupId: string | undefined, open: boolean) {
  if (!groupId) return;
  try {
    const all = JSON.parse(sessionStorage.getItem(OPEN_KEY) ?? "{}") as Record<string, boolean>;
    all[groupId] = open;
    sessionStorage.setItem(OPEN_KEY, JSON.stringify(all));
  } catch {
    /* private mode: groups just start closed */
  }
}

export function TaskGroup({
  groupId,
  title,
  tasks,
  totalTasks = tasks,
  onToggle,
  memberName,
  busy,
  defaultOpen = false,
}: {
  /** The checklist's id; remembers whether the group was open. */
  groupId?: string;
  title?: string;
  tasks: Task[];
  totalTasks?: Task[];
  onToggle: (task: Task) => void;
  memberName: (id: string | null) => string | undefined;
  busy: boolean;
  defaultOpen?: boolean;
}) {
  const { t, lang } = useLang();
  const [open, setOpenState] = useState(() => !title || (readOpen(groupId) ?? defaultOpen));
  const setOpen = (fn: (value: boolean) => boolean) =>
    setOpenState((value) => {
      const next = fn(value);
      writeOpen(groupId, next);
      return next;
    });
  const [doneOpen, setDoneOpen] = useState(() => readOpen(groupId ? `${groupId}:done` : undefined) ?? false);
  const toggleDone = () =>
    setDoneOpen((value) => {
      writeOpen(groupId ? `${groupId}:done` : undefined, !value);
      return !value;
    });
  const inProgress = totalTasks.filter((task) => task.status === "IN_PROGRESS").length;
  const completed = tasks.filter((task) => task.status === "DONE");
  const remaining = tasks.filter((task) => task.status !== "DONE");
  const count = totalTasks.filter((task) => task.status === "DONE").length;
  const tile = (task: Task) => (
    <div
      key={task.id}
      className="relative flex min-h-[60px] items-center gap-2 border-b border-divider py-3 last:border-0"
    >
      <Button
        variant="ghost"
        size="icon"
        disabled={busy}
        onClick={() => onToggle(task)}
        aria-label={t(
          `${task.status === "DONE" ? "Označit jako nesplněné" : "Označit jako hotové"}: ${taskTitle(task, "cs")}`,
          `${task.status === "DONE" ? "Mark as not done" : "Mark as done"}: ${taskTitle(task, "en")}`,
        )}
        className="relative z-10 size-11 shrink-0 rounded-full p-0"
      >
        {task.status === "DONE" ? (
          <span className="grid size-[26px] place-items-center rounded-[8px] bg-primary text-primary-foreground">
            <Check className="size-[18px]" strokeWidth={3} />
          </span>
        ) : (
          <Circle className="size-6 text-control-border" strokeWidth={2} />
        )}
      </Button>
      <div className="min-w-0 flex-1 text-[16px]">
        <Link
          to="/ukoly/$id"
          params={{ id: task.id }}
          className={`block font-semibold after:absolute after:inset-0 after:rounded-[8px] ${task.status === "DONE" ? "text-subtle line-through" : ""}`}
        >
          {taskTitle(task, lang)}
        </Link>
        <p className="break-words text-muted-foreground">
          {memberName(task.assignee_member_id) ?? t("Nepřiřazeno", "Unassigned")}
          {task.due_date ? ` · ${fmtDate(task.due_date)}` : ""} ·{" "}
          {taskCategoryLabel(task.category, lang)}
        </p>
        {task.status !== "DONE" && task.due_date && task.due_date < todayISO() && (
          <p className="font-semibold text-destructive">{t("Po termínu", "Overdue")}</p>
        )}
      </div>
      {/* In-progress tasks are visible in the list, not only on the task page (bug 8a). */}
      {task.status === "IN_PROGRESS" && (
        <span className="pointer-events-none shrink-0">
          <PillNeutral>{t("Probíhá", "In progress")}</PillNeutral>
        </span>
      )}
    </div>
  );
  return (
    <section
      className="card min-w-0 px-4 py-1"
      aria-label={title ?? t("Samostatné úkoly", "Standalone tasks")}
    >
      {title && (
        <Button
          variant="ghost"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="grid h-auto min-h-[60px] w-full grid-cols-[minmax(0,1fr)_auto] gap-2 whitespace-normal rounded-none border-b border-divider px-0 py-3 text-left text-[16px]"
        >
          <span className="min-w-0">
            <span className="block break-words text-[18px] font-bold">{title}</span>
            <span className="block text-muted-foreground">
              {t(`${count} z ${totalTasks.length} hotovo`, `${count} of ${totalTasks.length} done`)}
              {inProgress > 0 && t(` · ${inProgress} probíhá`, ` · ${inProgress} in progress`)}
            </span>
          </span>
          <ChevronDown className={`shrink-0 ${open ? "rotate-180" : ""}`} />
        </Button>
      )}
      {open && (
        <div>
          {remaining.map(tile)}
          {completed.length > 0 && (
            <div>
              <Button
                variant="ghost"
                onClick={toggleDone}
                aria-expanded={doneOpen}
                className="flex min-h-[60px] w-full justify-between whitespace-normal rounded-none px-0 text-[16px] font-bold"
              >
                <span>
                  {t("Hotovo", "Done")} ({completed.length})
                </span>
                <ChevronDown className={doneOpen ? "rotate-180" : ""} />
              </Button>
              {doneOpen && <div>{completed.map(tile)}</div>}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

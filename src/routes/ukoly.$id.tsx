import { Button } from "@/components/ui/button";
import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, ClipboardList, FileBadge, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AppShell } from "@/components/AppShell";
import { EmptyState, PillDanger, PillNeutral, PillOk, Skeleton } from "@/components/bits";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/account";
import { useLang } from "@/lib/i18n";
import {
  fmtDate,
  taskCategoryLabel,
  taskTitle,
  todayISO,
  urgencyLabel,
  type Task,
} from "@/lib/data";

export const Route = createFileRoute("/ukoly/$id")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Detail úkolu — My Chata" },
      { name: "description", content: "Details of a cottage task." },
      { property: "og:title", content: "Detail úkolu — My Chata" },
      { property: "og:description", content: "Details of a cottage task." },
    ],
  }),
  component: TaskDetail,
});

function TaskDetail() {
  const { id } = Route.useParams();
  const { property, members, currentMember } = useAccount();
  const isAdmin = currentMember?.role === "ADMIN" || currentMember?.role === "OWNER";
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { t, lang } = useLang();
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();

  // maybeSingle: a deleted task, or one from another account, is "not found", not an error
  // that leaves the page loading forever (T-025).
  const {
    data: task,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["task", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return (data as Task | null) ?? null;
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["task", id] });
    queryClient.invalidateQueries({ queryKey: ["tasks", property?.id] });
  };

  const update = useMutation({
    mutationFn: async (patch: {
      assignee_member_id?: string | null;
      due_date?: string | null;
      status?: "OPEN" | "IN_PROGRESS" | "DONE";
    }) => {
      const { error } = await supabase.from("tasks").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: () => toast.error(t("Změnu se nepodařilo uložit.", "Could not save the change.")),
  });

  const remove = useMutation({
    mutationFn: async () => {
      // Row-level security turns a refused delete into "0 rows", not an error: check it.
      const { data, error } = await supabase.from("tasks").delete().eq("id", id).select("id");
      if (error) throw error;
      if (!data?.length)
        throw new Error(
          t(
            "Úkol se nepodařilo smazat. Mazat úkoly může jen správce.",
            "The task could not be deleted. Only an admin can delete tasks.",
          ),
        );
    },
    onSuccess: async () => {
      toast.success(t("Úkol smazán.", "Task deleted."));
      await navigate({ to: "/ukoly" });
      queryClient.removeQueries({ queryKey: ["task", id] });
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (e: Error) => {
      setConfirmOpen(false);
      toast.error(e.message);
    },
  });

  if (isLoading) {
    return (
      <AppShell>
        <Skeleton className="h-48" />
      </AppShell>
    );
  }

  if (isError || !task) {
    return (
      <AppShell>
        <EmptyState
          icon={ClipboardList}
          title={
            isError
              ? t("Úkol se nepodařilo načíst.", "The task could not be loaded.")
              : t("Tento úkol už neexistuje.", "This task no longer exists.")
          }
          hint={
            isError
              ? t(
                  "Zkontrolujte připojení a zkuste to znovu.",
                  "Check your connection and try again.",
                )
              : t("Mohl být smazán.", "It may have been deleted.")
          }
          action={
            isError ? (
              <Button
                variant="fresh"
                size="fresh"
                onClick={() => void refetch()}
                className="btn-primary w-full"
              >
                {t("Zkusit znovu", "Try again")}
              </Button>
            ) : (
              <Link to="/ukoly" className="btn-primary w-full">
                {t("Zpět na údržbu", "Back to maintenance")}
              </Link>
            )
          }
        />
      </AppShell>
    );
  }

  const done = task.status === "DONE";
  const inProgress = task.status === "IN_PROGRESS";
  const overdue = !done && task.due_date && task.due_date < todayISO();

  return (
    <AppShell>
      <div className="flex items-center gap-2">
        <Button
          variant="fresh"
          size="fresh"
          // Back returns to the list as it was (open checklists, filter, scroll): bug 8.
          onClick={() =>
            router.history.canGoBack() ? router.history.back() : navigate({ to: "/ukoly" })
          }
          aria-label={t("Zpět", "Back")}
          className="grid size-11 place-items-center rounded-full bg-secondary"
        >
          <ArrowLeft className="size-5" />
        </Button>
        <h1 className="text-[28px] font-extrabold leading-[1.15]">
          {t("Detail úkolu", "Task detail")}
        </h1>
      </div>

      <section className="card mt-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-xl font-bold leading-snug">{taskTitle(task, lang)}</h2>
          {done ? (
            <PillOk>{t("Hotovo", "Done")}</PillOk>
          ) : overdue ? (
            <PillDanger>{t("Po termínu", "Overdue")}</PillDanger>
          ) : inProgress ? (
            <PillNeutral>{t("Probíhá", "In progress")}</PillNeutral>
          ) : (
            <PillNeutral>{t("Otevřené", "Open")}</PillNeutral>
          )}
        </div>

        <p className="mt-1 text-[16px] font-semibold text-muted-foreground">
          {taskCategoryLabel(task.category, lang)} · {t("Priorita", "Priority")}:{" "}
          {urgencyLabel(task.urgency, lang)}
        </p>

        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary text-muted-foreground">
              <User className="size-5" />
            </div>
            <div className="flex-1">
              <p className="text-[16px] font-semibold text-muted-foreground">
                {t("Odpovědná osoba", "Assignee")}
              </p>
              <select
                value={task.assignee_member_id ?? ""}
                onChange={(e) => update.mutate({ assignee_member_id: e.target.value || null })}
                className="field mt-1 font-semibold"
                aria-label={t("Přiřadit osobu", "Assign person")}
              >
                <option value="">{t("Nikdo", "Nobody")}</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary text-muted-foreground">
              <CalendarDays className="size-5" />
            </div>
            <div className="flex-1">
              <p className="text-[16px] font-semibold text-muted-foreground">
                {t("Termín", "Due date")}
              </p>
              <input
                type="date"
                value={task.due_date ?? ""}
                onChange={(e) => update.mutate({ due_date: e.target.value || null })}
                className="field mt-1 font-semibold"
                aria-label={t("Termín", "Due date")}
              />
            </div>
          </div>
        </div>

        {task.done_note && (
          <p className="mt-3 rounded-2xl bg-background p-3 text-[16px]">
            {t("Poznámka", "Note")}: „{task.done_note}“
          </p>
        )}
      </section>

      <div
        className="mt-4 grid grid-cols-3 gap-2"
        role="group"
        aria-label={t("Stav úkolu", "Task status")}
      >
        {(
          [
            ["OPEN", t("Otevřené", "Open")],
            ["IN_PROGRESS", t("Probíhá", "In progress")],
            ["DONE", t("Hotovo", "Done")],
          ] as const
        ).map(([status, label]) => (
          <Button
            variant="fresh"
            size="fresh"
            key={status}
            onClick={() => update.mutate({ status })}
            className={task.status === status ? "btn-dark px-2" : "btn-secondary px-2"}
          >
            {label}
          </Button>
        ))}
      </div>
      {done && (
        <Link to="/dokumenty" search={{ task: task.id }} className="btn-secondary mt-3 w-full">
          <FileBadge className="size-5" />
          {t("Uložit záruku k úkolu", "File a warranty for this task")}
        </Link>
      )}
      {isAdmin && (
        <>
          <Button
            variant="fresh"
            size="fresh"
            onClick={() => setConfirmOpen(true)}
            className="btn-secondary mt-6 min-h-11 w-full text-destructive"
          >
            {t("Smazat úkol", "Delete task")}
          </Button>
          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogContent className="w-[calc(100%-2rem)] rounded-3xl">
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {t(
                    `Smazat úkol „${taskTitle(task, lang)}“?`,
                    `Delete the task “${taskTitle(task, lang)}”?`,
                  )}
                </AlertDialogTitle>
                <AlertDialogDescription className="text-[16px]">
                  {t("Tuto akci nelze vrátit.", "This can't be undone.")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="min-h-11 text-[16px]">
                  {t("Zrušit", "Cancel")}
                </AlertDialogCancel>
                <AlertDialogAction
                  disabled={remove.isPending}
                  onClick={(e) => {
                    e.preventDefault();
                    remove.mutate();
                  }}
                  className="btn-danger-soft min-h-11 text-[16px]"
                >
                  {t("Smazat", "Delete")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </AppShell>
  );
}

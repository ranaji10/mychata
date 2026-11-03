import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AtSign, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/account";
import { useLang } from "@/lib/i18n";
import { fmtDateTime } from "@/lib/data";

export function TaskNotes({ taskId, focus }: { taskId: string; focus: boolean }) {
  const { t } = useLang();
  const { account, members, activeMembers, currentMember } = useAccount();
  const client = useQueryClient();
  const input = useRef<HTMLTextAreaElement>(null);
  const [body, setBody] = useState("");
  const [mentions, setMentions] = useState<string[]>([]);
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [remove, setRemove] = useState<string | null>(null);
  const key = ["task-notes", account?.id, taskId];
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: key,
    enabled: !!account,
    queryFn: async () => {
      const { data: notes, error } = await supabase
        .from("task_notes")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      const ids = (notes ?? []).map((note) => note.id);
      if (!ids.length)
        return { notes: notes ?? [], mentions: [] as { note_id: string; member_id: string }[] };
      const { data: tags, error: tagError } = await supabase
        .from("task_note_mentions")
        .select("note_id,member_id")
        .in("note_id", ids);
      if (tagError) throw tagError;
      return { notes: notes ?? [], mentions: tags ?? [] };
    },
  });
  useEffect(() => {
    if (focus) input.current?.focus();
  }, [focus]);
  const failure = (message: string) =>
    toast.error(
      t(`Poznámku se nepodařilo uložit: ${message}`, `Could not save the note: ${message}`),
    );
  const save = async () => {
    if (!body.trim() || body.trim().length > 2000 || mentions.length > 20) return;
    setBusy(true);
    try {
      if (editing) {
        const { data: changed, error } = await supabase
          .from("task_notes")
          .update({ body: body.trim() })
          .eq("id", editing)
          .eq("author_member_id", currentMember?.id ?? "")
          .select("id");
        if (error) throw error;
        if (!changed?.length) throw new Error("not_a_member");
      } else {
        const { error } = await supabase.rpc("add_task_note", {
          _task_id: taskId,
          _body: body.trim(),
          _mention_member_ids: mentions,
        });
        if (error) throw error;
      }
      setBody("");
      setMentions([]);
      setEditing(null);
      setPicker(false);
      await client.invalidateQueries({ queryKey: key });
      await client.invalidateQueries({ queryKey: ["stored-notifications"] });
      toast.success(t("Poznámka uložena.", "Note saved."));
    } catch (error) {
      failure((error as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const deleteNote = async () => {
    if (!remove) return;
    setBusy(true);
    try {
      const { data: changed, error } = await supabase
        .from("task_notes")
        .delete()
        .eq("id", remove)
        .eq("author_member_id", currentMember?.id ?? "")
        .select("id");
      if (error) throw error;
      if (!changed?.length) throw new Error("not_a_member");
      if (editing === remove) {
        setEditing(null);
        setBody("");
        setMentions([]);
      }
      setRemove(null);
      await client.invalidateQueries({ queryKey: key });
    } catch (error) {
      failure((error as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="mt-6 space-y-3">
      <h2 className="text-lg font-bold">{t("Poznámky", "Notes")}</h2>
      {isLoading && <p role="status">{t("Načítám…", "Loading…")}</p>}
      {isError && (
        <div role="alert">
          <p>{t("Poznámky se nepodařilo načíst.", "Could not load notes.")}</p>
          <Button
            variant="fresh"
            size="fresh"
            onClick={() => void refetch()}
            className="btn-secondary"
          >
            {t("Zkusit znovu", "Try again")}
          </Button>
        </div>
      )}
      {data?.notes.map((note) => (
        <article key={note.id} className="card space-y-2 p-4">
          <p className="text-[16px] font-semibold">
            {members.find((member) => member.id === note.author_member_id)?.name ??
              t("Člen", "Member")}{" "}
            · {fmtDateTime(note.created_at)}
          </p>
          <p className="whitespace-pre-wrap break-words text-[16px]">{note.body}</p>
          <div className="flex flex-wrap gap-2">
            {data.mentions
              .filter((tag) => tag.note_id === note.id)
              .map((tag) => (
                <span key={tag.member_id} className="pill bg-primary-soft text-primary">
                  @
                  {members.find((member) => member.id === tag.member_id)?.name ??
                    t("Člen", "Member")}
                </span>
              ))}
          </div>
          {note.author_member_id === currentMember?.id && (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="size-11"
                aria-label={t("Upravit poznámku", "Edit note")}
                onClick={() => {
                  setEditing(note.id);
                  setBody(note.body);
                  setMentions(
                    data.mentions
                      .filter((tag) => tag.note_id === note.id)
                      .map((tag) => tag.member_id),
                  );
                  input.current?.focus();
                }}
              >
                <Pencil className="size-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-11 text-destructive"
                aria-label={t("Smazat poznámku", "Delete note")}
                onClick={() => setRemove(note.id)}
              >
                <Trash2 className="size-5" />
              </Button>
            </div>
          )}
        </article>
      ))}
      <label className="block">
        <span className="label-text text-[16px]">
          {editing ? t("Upravit poznámku", "Edit note") : t("Přidat poznámku", "Add note")}
        </span>
        <textarea
          ref={input}
          className="field min-h-28 w-full"
          maxLength={2000}
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        {mentions.map((id) => (
          <span
            key={id}
            className="inline-flex items-center rounded-full bg-primary-soft pl-3 text-[16px] text-primary"
          >
            @{members.find((member) => member.id === id)?.name}
            <Button
              variant="ghost"
              size="icon"
              disabled={!!editing}
              className="size-11"
              aria-label={t("Odebrat zmínku", "Remove mention")}
              onClick={() => setMentions(mentions.filter((value) => value !== id))}
            >
              <X className="size-4" />
            </Button>
          </span>
        ))}
      </div>
      {!editing && (
        <Button
          variant="fresh"
          size="fresh"
          className="btn-secondary"
          aria-expanded={picker}
          aria-label={t("Zmínit člena", "Mention a member")}
          onClick={() => setPicker(!picker)}
        >
          <AtSign className="size-5" />
        </Button>
      )}
      {picker && !editing && (
        <div className="flex flex-wrap gap-2">
          {activeMembers.map((member) => (
            <Button
              variant="fresh"
              size="fresh"
              key={member.id}
              className="btn-secondary whitespace-normal"
              disabled={!mentions.includes(member.id) && mentions.length >= 20}
              aria-pressed={mentions.includes(member.id)}
              onClick={() =>
                setMentions(
                  mentions.includes(member.id)
                    ? mentions.filter((id) => id !== member.id)
                    : [...mentions, member.id],
                )
              }
            >
              {member.name}
            </Button>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Button
          variant="fresh"
          size="fresh"
          disabled={busy || !body.trim()}
          onClick={() => void save()}
          className="btn-primary flex-1"
        >
          {busy ? t("Ukládám…", "Saving…") : t("Uložit poznámku", "Save note")}
        </Button>
        {editing && (
          <Button
            variant="fresh"
            size="fresh"
            className="btn-secondary"
            onClick={() => {
              setEditing(null);
              setBody("");
              setMentions([]);
            }}
          >
            {t("Zrušit", "Cancel")}
          </Button>
        )}
      </div>
      <ConfirmDialog
        open={!!remove}
        onOpenChange={(open) => !open && setRemove(null)}
        title={t("Smazat poznámku?", "Delete note?")}
        description={t("Tuto akci nelze vrátit.", "This can't be undone.")}
        confirmLabel={t("Smazat", "Delete")}
        busy={busy}
        onConfirm={() => void deleteNote()}
      />
    </section>
  );
}

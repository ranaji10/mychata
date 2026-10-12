import { useLang } from "@/lib/i18n";

/** Shared clipboard-denied state: keep the actual link available outside the toast. */
export function ManualCopyLink({ url }: { url: string | null }) {
  const { t } = useLang();
  if (!url) return null;
  return (
    <div role="status" className="my-4 min-w-0 space-y-2 rounded-xl border border-border bg-secondary p-3 text-[16px]">
      <p>{t("Odkaz se nepodařilo zkopírovat. Podržte ho a zkopírujte ručně.", "Couldn't copy the link. Press and hold it to copy.")}</p>
      <a href={url} target="_blank" rel="noopener noreferrer" aria-label={t("Otevřít odkaz", "Open link")} className="block min-h-11 select-text break-all rounded-lg border border-input bg-card p-3 text-primary underline">{url}</a>
    </div>
  );
}
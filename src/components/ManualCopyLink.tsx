import { useEffect, useRef } from "react";
import { useLang } from "@/lib/i18n";

/** Shared clipboard-denied state: keep the actual link available outside the toast. */
export function ManualCopyLink({ url }: { url: string | null }) {
  const { t } = useLang();
  const field = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (url) {
      field.current?.focus();
      field.current?.select();
    }
  }, [url]);
  return (
    <div className={url ? "my-2 min-w-0 space-y-2 text-[16px]" : ""}>
      <p role="status" aria-atomic="true">
        {url
          ? t(
              "Odkaz se nepodařilo zkopírovat. Označte ho a zkopírujte.",
              "Couldn't copy the link. Select it and copy.",
            )
          : ""}
      </p>
      {url && (
        <input
          ref={field}
          readOnly
          value={url}
          aria-label={t("Odkaz ke zkopírování", "Link to copy")}
          onFocus={(event) => event.currentTarget.select()}
          onClick={(event) => event.currentTarget.select()}
          className="field w-full min-w-0 select-text text-[16px]"
        />
      )}
    </div>
  );
}

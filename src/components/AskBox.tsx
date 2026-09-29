import { BookOpen, FileText, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { useLang } from "@/lib/i18n";
import { askManual, type AskManualResult } from "@/lib/manual-qa.functions";

/**
 * "Ask a question" box on the House Manual and the Document Vault (T-021). Answers come
 * from the manual sections and the documents the person is allowed to see, with sources.
 */
export function AskBox({
  propertyId,
  title,
  placeholder,
}: {
  propertyId: string | undefined;
  title: string;
  placeholder: string;
}) {
  const { t, lang } = useLang();
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [result, setResult] = useState<AskManualResult | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  const ask = async () => {
    if (!propertyId || question.trim().length < 2 || asking) return;
    setAsking(true);
    setResult(null);
    setFailed(null);
    try {
      setResult(await askManual({ data: { propertyId, question: question.trim(), lang } }));
    } catch (e) {
      console.error("[ask] failed", e);
      setFailed((e as { message?: string } | null)?.message ?? String(e));
    } finally {
      setAsking(false);
    }
  };

  const reasonText: Record<NonNullable<AskManualResult["reason"]>, string> = {
    limit: t(
      "Dnešní limit otázek je vyčerpán. Zkuste to zítra.",
      "Today's question limit is reached. Try again tomorrow.",
    ),
    disabled: t("Odpovědi AI jsou dočasně vypnuté.", "AI answers are switched off for now."),
    empty: t(
      "Manuál ani dokumenty zatím nic neobsahují. Přidejte sekci manuálu nebo nahrajte dokument.",
      "The manual and the documents are still empty. Add a manual section or upload a document.",
    ),
    no_match: t(
      "V manuálu ani v dokumentech jsem odpověď nenašel. Doplňte ji do manuálu.",
      "I couldn't find that in the manual or the documents. Consider adding it to the manual.",
    ),
  };

  return (
    <section className="card mb-4 p-4">
      <h2 className="flex items-center gap-2 font-bold">
        <Sparkles className="size-5 text-primary" />
        {title}
      </h2>
      <form
        className="mt-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void ask();
        }}
      >
        <input
          className="field min-w-0 flex-1"
          placeholder={placeholder}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          aria-label={title}
        />
        <button
          type="submit"
          className="btn-primary shrink-0"
          disabled={asking || question.trim().length < 2 || !propertyId}
        >
          {asking ? <Loader2 className="size-5 animate-spin" /> : t("Zeptat se", "Ask")}
        </button>
      </form>
      {asking && (
        <p className="mt-3 text-[14px] font-semibold text-muted-foreground" aria-live="polite">
          {t("Hledám v manuálu a dokumentech…", "Looking through the manual and documents…")}
        </p>
      )}
      {failed && (
        <p className="mt-3 rounded-2xl bg-danger-soft p-3 text-[14px] font-semibold text-danger">
          {t(`Odpověď se nepodařilo získat: ${failed}`, `Could not get an answer: ${failed}`)}
        </p>
      )}
      {result && (
        <div className="mt-3 space-y-2" aria-live="polite">
          <p className="whitespace-pre-wrap rounded-2xl bg-secondary p-3 text-[15px]">
            {result.answer ?? (result.reason ? reasonText[result.reason] : reasonText.no_match)}
          </p>
          {result.excerptOnly && (
            <p className="text-[13px] text-muted-foreground">
              {t(
                "Toto je nejbližší úryvek ze zdroje níže (odpověď AI teď není dostupná).",
                "This is the closest passage from the source below (an AI answer isn't available right now).",
              )}
            </p>
          )}
          {!!result.sources.length && (
            <div className="flex flex-wrap gap-1.5">
              {result.sources.map((s) => (
                <span key={`${s.kind}:${s.id}`} className="pill bg-primary-soft text-primary">
                  {s.kind === "manual" ? (
                    <BookOpen className="size-3.5" />
                  ) : (
                    <FileText className="size-3.5" />
                  )}
                  {s.title}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

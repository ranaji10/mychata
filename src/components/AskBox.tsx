import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import { BookOpen, FileText, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { useLang } from "@/lib/i18n";
import { MAX_EARLIER_TURNS } from "@/lib/manual-answers";
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
  const [asking, setAsking] = useState<string | null>(null);
  // Earlier questions stay on screen and the box empties after each one, so a follow-up
  // doesn't mean deleting the last question first (bug 12 of 18 Oct).
  const [thread, setThread] = useState<
    { question: string; result: AskManualResult | null; failed: string | null }[]
  >([]);

  const ask = async () => {
    const q = question.trim();
    if (!propertyId || q.length < 2 || asking) return;
    setAsking(q);
    setQuestion("");
    try {
      // Earlier answered turns go along, so "and in winter?" knows what it follows (T-041).
      const earlier = thread
        .filter((item) => item.result?.answer)
        .slice(-MAX_EARLIER_TURNS)
        .map((item) => ({
          question: item.question.slice(0, 500),
          answer: (item.result?.answer ?? "").slice(0, 2000),
        }));
      const result = await askManual({ data: { propertyId, question: q, lang, earlier } });
      setThread((items) => [...items, { question: q, result, failed: null }]);
      // Never the question or the answer: only whether it was answered (T-043).
      track("manual_question", { result: result.reason ?? "answered", step: earlier.length + 1 });
    } catch (e) {
      console.error("[ask] failed", e);
      const failed = (e as { message?: string } | null)?.message ?? String(e);
      setThread((items) => [...items, { question: q, result: null, failed }]);
      // Give the question back so it can be sent again.
      setQuestion((current) => current || q);
    } finally {
      setAsking(null);
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
      {thread.length > 0 && (
        <ol className="mt-3 space-y-3" aria-live="polite">
          {thread.map((item, index) => (
            <li key={index} className="space-y-2">
              <p className="ml-8 rounded-2xl bg-primary-soft p-3 text-[16px] font-semibold text-primary">
                {item.question}
              </p>
              {item.failed ? (
                <p className="rounded-2xl bg-destructive-soft p-3 text-[16px] font-semibold text-destructive">
                  {t(
                    `Odpověď se nepodařilo získat: ${item.failed}`,
                    `Could not get an answer: ${item.failed}`,
                  )}
                </p>
              ) : item.result ? (
                <Answer result={item.result} reasonText={reasonText} />
              ) : null}
            </li>
          ))}
        </ol>
      )}
      {asking && (
        <div className="mt-3 space-y-2" aria-live="polite">
          <p className="ml-8 rounded-2xl bg-primary-soft p-3 text-[16px] font-semibold text-primary">
            {asking}
          </p>
          <p className="text-[16px] font-semibold text-muted-foreground">
            {t("Hledám v manuálu a dokumentech…", "Looking through the manual and documents…")}
          </p>
        </div>
      )}
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void ask();
        }}
      >
        <input
          className="field min-w-0 flex-1"
          placeholder={thread.length ? t("Další otázka…", "Ask a follow-up…") : placeholder}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          aria-label={title}
          enterKeyHint="send"
        />
        <Button
          variant="fresh"
          size="fresh"
          type="submit"
          className="btn-primary shrink-0"
          disabled={!!asking || question.trim().length < 2 || !propertyId}
        >
          {asking ? <Loader2 className="size-5 animate-spin" /> : t("Zeptat se", "Ask")}
        </Button>
      </form>
      {thread.length > 0 && !asking && (
        <Button
          variant="fresh"
          size="fresh"
          className="mt-2 min-h-11 px-2 text-[16px] font-bold text-primary"
          onClick={() => setThread([])}
        >
          {t("Začít znovu", "Start over")}
        </Button>
      )}
    </section>
  );
}

function Answer({
  result,
  reasonText,
}: {
  result: AskManualResult;
  reasonText: Record<NonNullable<AskManualResult["reason"]>, string>;
}) {
  const { t } = useLang();
  return (
    <div className="space-y-2">
      <p className="mr-8 whitespace-pre-wrap rounded-2xl bg-secondary p-3 text-[16px]">
        {result.answer ?? (result.reason ? reasonText[result.reason] : reasonText.no_match)}
      </p>
      {result.excerptOnly && (
        <p className="text-[16px] text-muted-foreground">
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
  );
}

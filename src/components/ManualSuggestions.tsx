import { Button } from "@/components/ui/button";
import { MANUAL_QUESTIONS } from "@/lib/cottage-content";
import { useLang } from "@/lib/i18n";

export interface ManualSuggestion {
  titleCs: string;
  titleEn: string;
  contentCs: string;
  contentEn: string;
  category: string;
  visibility: string;
}

export function ManualSuggestions({ sections, canEdit, onChoose }: {
  sections: { title_cs: string; content_cs: string; content_en: string }[];
  canEdit: boolean;
  onChoose: (draft: ManualSuggestion) => void;
}) {
  const { t } = useLang();
  return <div className="mt-5 space-y-5">{MANUAL_QUESTIONS.map(group => {
    const unanswered = group.questions.filter(question => !sections.some(section => section.title_cs === question.title[0] && (section.content_cs.trim() || section.content_en.trim())));
    if (!unanswered.length) return null;
    return <section key={group.title[0]} className="space-y-3">
      <h2 className="text-lg font-bold">{t(group.title[0], group.title[1])}</h2>
      {unanswered.map(question => <article key={question.title[0]} className="card space-y-3 p-4">
        <h3 className="text-[16px] font-bold">{t(question.title[0], question.title[1])}</h3>
        {canEdit && <div className="flex flex-col gap-2">{question.answers.map(answer => <Button key={answer[0]} variant="fresh" size="fresh" className="btn-secondary h-auto min-h-11 justify-start whitespace-normal py-3 text-left text-[16px]" onClick={() => onChoose({titleCs:question.title[0], titleEn:question.title[1], contentCs:answer[0], contentEn:answer[1], category:group.category, visibility:"MEMBERS_ONLY"})}>{t(answer[0], answer[1])}</Button>)}
          <Button variant="fresh" size="fresh" className="btn-secondary justify-start" onClick={() => onChoose({titleCs:question.title[0], titleEn:question.title[1], contentCs:"", contentEn:"", category:group.category, visibility:"MEMBERS_ONLY"})}>{t("Jiné…", "Other…")}</Button>
        </div>}
      </article>)}
    </section>;
  })}</div>;
}
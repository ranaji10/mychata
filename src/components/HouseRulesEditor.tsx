import { Button } from "@/components/ui/button";
import { STARTER_RULES } from "@/lib/cottage-content";
import { useLang } from "@/lib/i18n";
import { Plus, Trash2 } from "lucide-react";

export function HouseRulesEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { t } = useLang();
  const rows = value ? value.split("\n") : [];
  return <div className="space-y-3">
    <Button variant="fresh" size="fresh" type="button" className="btn-secondary w-full whitespace-normal" onClick={() => onChange(STARTER_RULES.map(([cs,en]) => t(cs,en)).join("\n"))}>{t("Použít základní pravidla", "Use a starter set")}</Button>
    <ol className="space-y-2">{rows.map((row,index) => <li key={index} className="flex items-start gap-2">
      <textarea className="field min-h-24 flex-1" aria-label={t(`Pravidlo ${index+1}`, `Rule ${index+1}`)} value={row} onChange={event => onChange(rows.map((text,i) => i === index ? event.target.value.replace(/\n/g," ") : text).join("\n"))} />
      <Button type="button" variant="ghost" size="icon" className="size-11 shrink-0 text-destructive" aria-label={t(`Odebrat pravidlo ${index+1}`, `Remove rule ${index+1}`)} onClick={() => onChange(rows.filter((_,i) => i !== index).join("\n"))}><Trash2 className="size-5" /></Button>
    </li>)}</ol>
    <Button type="button" variant="fresh" size="fresh" className="btn-secondary w-full" onClick={() => onChange([...rows, " "].join("\n"))}><Plus className="size-5" />{t("Přidat pravidlo", "Add rule")}</Button>
  </div>;
}
// Pure helpers for answering questions from the house manual and the Document Vault.
// No network or database here, so they run in unit tests (manual-answers.test.ts).

export interface AnswerSource {
  /** "m:<section id>" or "d:<document id>" */
  key: string;
  kind: "manual" | "document";
  id: string;
  title: string;
  text: string;
}

const MAX_SOURCE_CHARS = 60_000;
export const MAX_CONTEXT_CHARS = 150_000;

/** Lower case without accents, so "topení" matches "topeni". */
export function fold(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

const STOP = new Set([
  "the", "and", "for", "are", "how", "what", "where", "when", "can", "does", "with", "this", "that",
  "jak", "kde", "kdy", "jsou", "je", "se", "na", "do", "to", "co", "pro", "nebo", "ale", "jaky", "jaka",
]);

export function keywords(question: string): string[] {
  return [
    ...new Set(
      fold(question)
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length >= 3 && !STOP.has(w)),
    ),
  ];
}

/**
 * How well a source matches the question: whole words count double, word starts count
 * once (so "kočky" matches "kočka" via the stem "kock", and "cats" matches "cat").
 */
export function score(source: Pick<AnswerSource, "title" | "text">, words: string[]): number {
  const hay = fold(`${source.title}\n${source.title}\n${source.text}`);
  let total = 0;
  for (const w of words) {
    const stem = w.length > 3 ? w.slice(0, -1) : w;
    if (new RegExp(`\\b${w}\\b`).test(hay)) total += 2;
    else if (hay.includes(stem)) total += 1;
  }
  return total;
}

export function rankSources(sources: AnswerSource[], question: string): AnswerSource[] {
  const words = keywords(question);
  return sources
    .map((s, i) => ({ s, i, v: score(s, words) }))
    .sort((a, b) => b.v - a.v || a.i - b.i)
    .map((x) => x.s);
}

/**
 * What goes to the model: everything when it fits (a cottage's manual and papers usually
 * do), otherwise the best-matching sources first until the budget is used.
 */
export function buildContext(
  sources: AnswerSource[],
  question: string,
  budget = MAX_CONTEXT_CHARS,
): AnswerSource[] {
  const trimmed = sources.map((s) => ({ ...s, text: s.text.slice(0, MAX_SOURCE_CHARS) }));
  const size = (list: AnswerSource[]) =>
    list.reduce((n, s) => n + s.title.length + s.text.length + 40, 0);
  if (size(trimmed) <= budget) return trimmed;
  const out: AnswerSource[] = [];
  let used = 0;
  for (const s of rankSources(trimmed, question)) {
    const cost = s.title.length + s.text.length + 40;
    if (used + cost > budget) continue;
    out.push(s);
    used += cost;
  }
  return out;
}

/** The best paragraph of the best source, for when no AI answer is available. */
export function bestExcerpt(
  sources: AnswerSource[],
  question: string,
): { source: AnswerSource; excerpt: string } | null {
  const words = keywords(question);
  const ranked = rankSources(sources, question);
  const top = ranked[0];
  if (!top || score(top, words) === 0) return null;
  const paragraphs = top.text.split(/\n\s*\n|\n/).filter((p) => p.trim());
  const best = paragraphs
    .map((p, i) => ({ p, i, v: score({ title: "", text: p }, words) }))
    .sort((a, b) => b.v - a.v || a.i - b.i)[0];
  const excerpt = (best && best.v > 0 ? best.p : top.text).trim().slice(0, 1200);
  return { source: top, excerpt };
}

/** Reads the model's reply: JSON {"answer", "sources"} if it complied, plain text if not. */
export function parseModelAnswer(
  content: string,
  sourceCount: number,
): { answer: string; used: number[] } {
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/, "")
    .trim();
  try {
    const parsed = JSON.parse(cleaned) as { answer?: unknown; sources?: unknown };
    if (typeof parsed.answer === "string" && parsed.answer.trim()) {
      const used = Array.isArray(parsed.sources)
        ? parsed.sources
            .map((n) => Number(n))
            .filter((n) => Number.isInteger(n) && n >= 1 && n <= sourceCount)
        : [];
      return { answer: parsed.answer.trim(), used: [...new Set(used)] };
    }
  } catch {
    /* not JSON: use the text as it is */
  }
  const used = [...cleaned.matchAll(/\[(\d+)\]/g)]
    .map((m) => Number(m[1]))
    .filter((n) => n >= 1 && n <= sourceCount);
  return { answer: cleaned, used: [...new Set(used)] };
}

/** Plain text of a Word document's main XML (word/document.xml). */
export function docxXmlToText(xml: string): string {
  return xml
    .replace(/<w:tab\/>/g, "\t")
    .replace(/<w:br\/>/g, "\n")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Finds one file inside a ZIP archive (a .docx is one). Returns its raw bytes and method. */
export function zipEntry(
  bytes: Uint8Array,
  wanted: string,
): { method: number; data: Uint8Array } | null {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65_557); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return null;
  const count = dv.getUint16(eocd + 10, true);
  let off = dv.getUint32(eocd + 16, true);
  const decoder = new TextDecoder();
  for (let n = 0; n < count; n++) {
    if (off + 46 > bytes.length || dv.getUint32(off, true) !== 0x02014b50) return null;
    const method = dv.getUint16(off + 10, true);
    const compressed = dv.getUint32(off + 20, true);
    const nameLen = dv.getUint16(off + 28, true);
    const extraLen = dv.getUint16(off + 30, true);
    const commentLen = dv.getUint16(off + 32, true);
    const local = dv.getUint32(off + 42, true);
    const name = decoder.decode(bytes.subarray(off + 46, off + 46 + nameLen));
    if (name === wanted) {
      const localName = dv.getUint16(local + 26, true);
      const localExtra = dv.getUint16(local + 28, true);
      const start = local + 30 + localName + localExtra;
      return { method, data: bytes.slice(start, start + compressed) };
    }
    off += 46 + nameLen + extraLen + commentLen;
  }
  return null;
}

/** Which gateway model to try first: Gemini Flash models, newest version first. */
export function preferredChatModels(listed: string[], fallback: string[]): string[] {
  const version = (id: string) => Number(/(\d+(?:\.\d+)?)/.exec(id)?.[1] ?? 0);
  const flash = listed
    .filter((id) => /gemini/i.test(id) && /flash/i.test(id))
    .filter((id) => !/image|tts|audio|live|embed|lite/i.test(id))
    .sort((a, b) => version(b) - version(a));
  return [...new Set([...flash, ...fallback])];
}

export type FileKind = "text" | "docx" | "pdf" | "image" | "unsupported";

export function fileKind(name: string, mime = ""): FileKind {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  if (["txt", "md", "csv", "json"].includes(ext) || mime.startsWith("text/")) return "text";
  if (ext === "docx") return "docx";
  if (ext === "pdf" || mime === "application/pdf") return "pdf";
  if (["jpg", "jpeg", "png", "webp", "heic", "heif", "gif"].includes(ext) || mime.startsWith("image/"))
    return "image";
  return "unsupported";
}

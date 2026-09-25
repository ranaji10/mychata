import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const EMBED_MODEL = "google/gemini-embedding-001";
const CHAT_MODEL = "google/gemini-2.5-flash-lite";

async function embed(text: string, apiKey: string): Promise<number[]> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMBED_MODEL, input: text }),
  });
  if (!res.ok) throw new Error("embed failed");
  const json = (await res.json()) as { data: { embedding: number[] }[] };
  return json.data[0]!.embedding;
}

/** Rebuilds the searchable chunks for one property's manual sections. */
export const rebuildManualChunks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ propertyId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { ok: false };
    const { data: sections, error } = await context.supabase
      .from("manual_sections")
      .select("id, title_cs, title_en, content_cs, content_en")
      .eq("property_id", data.propertyId);
    if (error) throw error;
    await context.supabase.from("manual_chunks").delete().eq("property_id", data.propertyId);
    for (const s of sections ?? []) {
      for (const [lang, text] of [
        ["cs", `${s.title_cs}\n${s.content_cs}`],
        ["en", `${s.title_en}\n${s.content_en}`],
      ] as const) {
        if (!text.trim()) continue;
        try {
          const embedding = await embed(text, apiKey);
          await context.supabase.from("manual_chunks").insert({ section_id: s.id, property_id: data.propertyId, lang, content: text, embedding: JSON.stringify(embedding) } as never);
        } catch {
          /* skip failed chunk */
        }
      }
    }
    return { ok: true };
  });

/** Answers a question from the property's manual using account-scoped retrieval. */
export const askManual = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ propertyId: z.string().uuid(), question: z.string().min(2).max(500), lang: z.enum(["cs", "en"]) }).parse(data))
  .handler(async ({ data, context }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { answer: null, sources: [] as string[] };
    let chunks: { content: string; section_id: string }[] = [];
    try {
      const queryEmbedding = await embed(data.question, apiKey);
      const { data: matches } = await context.supabase.rpc("match_manual_chunks", {
        _property_id: data.propertyId,
        _embedding: JSON.stringify(queryEmbedding),
        _match_count: 4,
      });
      chunks = (matches ?? []) as { content: string; section_id: string }[];
    } catch {
      chunks = [];
    }
    if (!chunks.length) {
      // Fallback: keyword search over sections the user can read.
      const { data: sections } = await context.supabase
        .from("manual_sections")
        .select("id, title_cs, title_en, content_cs, content_en")
        .eq("property_id", data.propertyId)
        .limit(6);
      chunks = (sections ?? []).map((s) => ({ section_id: s.id, content: data.lang === "en" ? `${s.title_en}\n${s.content_en}` : `${s.title_cs}\n${s.content_cs}` }));
    }
    const contextText = chunks.map((c) => c.content).join("\n---\n").slice(0, 6000);
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: CHAT_MODEL,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: `You are the house manual assistant for a shared cottage. Answer ONLY from the manual excerpts below, in ${data.lang === "cs" ? "Czech" : "English"}. Keep it short and practical. If the answer is not in the excerpts, say you don't know and suggest flagging the manual as outdated. Excerpts:\n${contextText}`,
          },
          { role: "user", content: data.question },
        ],
      }),
    });
    if (!res.ok) return { answer: null, sources: [] as string[] };
    const json = (await res.json()) as { choices: { message: { content: string } }[] };
    return { answer: json.choices[0]?.message.content ?? null, sources: [...new Set(chunks.map((c) => c.section_id))] };
  });

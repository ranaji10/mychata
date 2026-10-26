import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AI_DAILY_LIMITS } from "@/lib/limits";

const inputSchema = z.object({
  text: z.string().trim().min(1).max(500),
  sourceLanguage: z.enum(["cs", "en"]),
});

export const translateTaskText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => inputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const targetLanguage = data.sourceLanguage === "cs" ? "English" : "Czech";
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { translation: data.text };

    // Kill switch and per-user daily cap (migration 0015). On refusal the task keeps its
    // original wording, which the UI already handles as "translation unavailable".
    const { data: enabled, error: flagError } = await context.supabase.rpc("feature_enabled", {
      _key: "ai_translate",
    });
    if (flagError) console.error("[translate] feature_enabled", flagError.message);
    if (!enabled) return { translation: data.text };
    const { data: allowed, error: usageError } = await context.supabase.rpc("bump_usage", {
      _kind: "ai_translate",
      _daily_limit: AI_DAILY_LIMITS.taskTranslations,
    });
    if (usageError) console.error("[translate] bump_usage", usageError.message);
    if (!allowed) return { translation: data.text };

    let response: Response;
    try {
      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        // A slow gateway must not hold up saving a task (B-005, T-014): keep the text as typed.
        signal: AbortSignal.timeout(10_000),
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            {
              role: "system",
              content: `Translate short cottage-maintenance task text into ${targetLanguage}. Return only the natural translation without quotes or commentary.`,
            },
            { role: "user", content: data.text },
          ],
          temperature: 0.1,
        }),
      });
    } catch (e) {
      console.error("[task-translation] gateway", (e as Error).name, (e as Error).message);
      return { translation: data.text };
    }

    if (!response.ok) return { translation: data.text };
    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return { translation: payload.choices?.[0]?.message?.content?.trim() || data.text };
  });

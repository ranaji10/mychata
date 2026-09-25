import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({
  text: z.string().trim().min(1).max(500),
  sourceLanguage: z.enum(["cs", "en"]),
});

export const translateTaskText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => inputSchema.parse(input))
  .handler(async ({ data }) => {
    const targetLanguage = data.sourceLanguage === "cs" ? "English" : "Czech";
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { translation: data.text };

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
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

    if (!response.ok) return { translation: data.text };
    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return { translation: payload.choices?.[0]?.message?.content?.trim() || data.text };
  });

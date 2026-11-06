// Inputs of the server functions, in one place so each is tested (T-065, zod 4, O-31).
// zod 4: ids use z.guid() (any 8-4-4-4-12 hex id, as zod 3's uuid() accepted); z.uuid() would
// refuse ids without RFC version bits, e.g. hand-written seed ids. E-mail uses z.email().
import { z } from "zod";
import { MAX_EARLIER_TURNS } from "@/lib/manual-answers";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** Guest link page (organisations' shared request form). */
export const guestLinkInput = z.object({ token: z.string().min(16).max(64) });

/** A guest's stay request from the organisation's shared link. */
export const guestRequestInput = z.object({
  token: z.string().min(16).max(64),
  name: z.string().min(2).max(120),
  email: z.email().max(200),
  startDate: isoDate,
  endDate: isoDate,
  guests: z.number().int().min(1).max(50),
  note: z.string().max(1000).optional(),
  // Honeypot: must stay empty; bots fill it.
  company: z.string().max(0).optional(),
});

/** Rebuild the manual's search index for one cottage. */
export const propertyInput = z.object({ propertyId: z.guid() });

/** Read an uploaded document's text. */
export const documentInput = z.object({ documentId: z.guid() });

/** A question to the house manual, with up to MAX_EARLIER_TURNS earlier turns. */
export const askManualInput = z.object({
  propertyId: z.guid(),
  question: z.string().min(2).max(500),
  lang: z.enum(["cs", "en"]),
  // The same box's earlier questions and answers, so a follow-up has its context (T-041).
  earlier: z
    .array(z.object({ question: z.string().max(500), answer: z.string().max(2000) }))
    .max(MAX_EARLIER_TURNS)
    .optional(),
});

/** A task title or note to translate. */
export const translateInput = z.object({
  text: z.string().trim().min(1).max(500),
  sourceLanguage: z.enum(["cs", "en"]),
});

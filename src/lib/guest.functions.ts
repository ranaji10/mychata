import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

// Guest links let someone without an account see busy dates and ask for a stay.
// Everything goes through database functions keyed by the link token
// (public_guest_link, public_guest_availability, submit_guest_request), which check
// the link, validate input and rate-limit. See drizzle/migrations/0012.

function publicClient() {
  return createClient<Database>(
    process.env["SUPABASE_URL"]!,
    process.env["SUPABASE_PUBLISHABLE_KEY"]!,
    {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    },
  );
}

export const getGuestLinkInfo = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ token: z.string().min(16).max(64) }).parse(data))
  .handler(async ({ data }) => {
    const supabase = publicClient();
    const { data: link, error } = await supabase.rpc("public_guest_link", { _token: data.token });
    if (error || !link?.length) return null;
    const row = link[0]!;
    const { data: availability, error: availabilityError } = await supabase.rpc(
      "public_guest_availability",
      { _token: data.token },
    );
    if (availabilityError) throw new Error("availability_failed");
    return {
      propertyName: row.property_name,
      propertyAddress: row.property_address,
      validFrom: row.valid_from,
      validTo: row.valid_to,
      availability: availability ?? [],
    };
  });

export type GuestRequestResult =
  | { ok: true }
  | { ok: false; error: "link" | "dates" | "guests" | "name" | "email" | "rate" | "save" };

export const submitGuestRequest = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        token: z.string().min(16).max(64),
        name: z.string().min(2).max(120),
        email: z.string().email().max(200),
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        guests: z.number().int().min(1).max(50),
        note: z.string().max(1000).optional(),
        // Honeypot: must stay empty; bots fill it.
        company: z.string().max(0).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data: input }): Promise<GuestRequestResult> => {
    if (input.company) return { ok: true }; // silently drop bots
    if (input.endDate < input.startDate) return { ok: false, error: "dates" };
    const supabase = publicClient();
    const { data: result, error } = await supabase.rpc("submit_guest_request", {
      _token: input.token,
      _name: input.name,
      _email: input.email,
      _start: input.startDate,
      _end: input.endDate,
      _guests: input.guests,
      ...(input.note ? { _note: input.note } : {}),
    });
    if (error) return { ok: false, error: "save" };
    if (result === "ok") return { ok: true };
    return {
      ok: false,
      error: (result as Exclude<GuestRequestResult, { ok: true }>["error"]) ?? "save",
    };
  });

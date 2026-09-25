import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

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
  .inputValidator((data) => z.object({ token: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const supabase = publicClient();
    const { data: link, error } = await supabase.rpc("public_guest_link", { _token: data.token });
    if (error || !link?.length) return null;
    const row = link[0]!;
    const { data: availability } = await supabase.rpc("public_booking_availability", {
      _property_id: row.property_id,
    });
    return {
      propertyId: row.property_id,
      propertyName: row.property_name,
      propertyAddress: row.property_address,
      availability: availability ?? [],
    };
  });

export const submitGuestRequest = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        token: z.string().uuid(),
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
  .handler(async ({ data: input }) => {
    if (input.company) return { ok: true }; // silently drop bots
    if (input.endDate < input.startDate) return { ok: false, error: "dates" };
    const supabase = publicClient();
    const { data: link, error } = await supabase.rpc("public_guest_link", { _token: input.token });
    if (error || !link?.length) return { ok: false, error: "link" };
    const { error: insertError } = await supabase.from("guest_requests").insert({
      guest_link_id: link[0]!.id,
      property_id: link[0]!.property_id,
      guest_name: input.name,
      guest_email: input.email,
      start_date: input.startDate,
      end_date: input.endDate,
      guests: input.guests,
      note: input.note ?? null,
      status: "PENDING",
    });
    if (insertError) return { ok: false, error: "save" };
    return { ok: true };
  });

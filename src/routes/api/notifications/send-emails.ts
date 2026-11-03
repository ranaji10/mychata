import { createFileRoute } from "@tanstack/react-router";

// Sends queued notification e-mails (T-053). Called by a Lovable cron job every few minutes with
// "Authorization: Bearer <LOVABLE_CRON_SECRET>"; anything else gets 401. Returns counts only.
export const Route = createFileRoute("/api/notifications/send-emails")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { authenticateCronRequest } = await import("@/integrations/supabase/cron-auth");
        const denied = await authenticateCronRequest(request);
        if (denied) return denied;
        try {
          const { runEmailQueue } = await import("@/lib/notification-queue.server");
          return Response.json(await runEmailQueue());
        } catch (e) {
          console.error("[notifications] e-mail queue run failed", e);
          return Response.json({ error: "queue_failed" }, { status: 500 });
        }
      },
    },
  },
});

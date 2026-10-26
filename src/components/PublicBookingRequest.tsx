import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { CalendarPlus, Check, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CalendarLegend, CalendarMonth, MonthHeader, useMonthNav } from "@/components/calendar";
import { supabase } from "@/integrations/supabase/client";
import { fmtDate, fmtDateTime, pickRange, type Booking, type DateRange } from "@/lib/data";
import { useLang } from "@/lib/i18n";
import { track } from "@/lib/analytics";
import { LIVE_REFRESH_MS } from "@/lib/guest-requests";
import {
  RETURN_CALENDAR_META,
  clearPendingCalendar,
  pendingCalendar,
  publicRequestMessage,
  savePendingCalendar,
} from "@/lib/pending-booking";

/** The signed-in visitor, kept current (public pages don't load the account). */
function useSignedInUser() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    supabase.auth.getUser().then(({ data, error }) => {
      if (error) console.warn("[public-calendar] getUser", error.message);
      if (alive) setUser(data.user ?? null);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (alive) setUser(session?.user ?? null);
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);
  return user;
}

/**
 * "Request a booking" on the public calendar (T-043, migration 0034). Signed out: one button
 * that keeps the link and opens sign-up. Signed in: pick dates, guests, note, send; below it,
 * the visitor's own requests with when they asked and who decided.
 */
export function PublicBookingRequest({
  token,
  bookings,
  propertyName,
}: {
  token: string;
  bookings: Booking[];
  propertyName: string;
}) {
  const { t, lang } = useLang();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useSignedInUser();
  const nav = useMonthNav();
  // Came back from sign-up for this calendar: open the form straight away.
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<DateRange>({ start: null, end: null });
  const [guests, setGuests] = useState("2");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    if (pendingCalendar() === token) {
      clearPendingCalendar();
      setOpen(true);
    }
    // The cross-browser fallback has done its job once the visitor is back here.
    if (user.user_metadata?.[RETURN_CALENDAR_META]) {
      void supabase.auth
        .updateUser({ data: { [RETURN_CALENDAR_META]: null } })
        .then(({ error }) => {
          if (error) console.warn("[public-calendar] clear return_calendar", error.message);
        });
    }
  }, [user, token]);

  const mine = useQuery({
    queryKey: ["my-public-requests", token, user?.id],
    enabled: !!user,
    // The admin's decision shows without a reload (F-25): fresh on every visit and every 30 s
    // while the tab is in front.
    staleTime: 0,
    refetchInterval: LIVE_REFRESH_MS,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("my_public_booking_requests", { _token: token });
      if (error) throw error;
      return data ?? [];
    },
  });

  const send = useMutation({
    mutationFn: async () => {
      const n = Number.parseInt(guests, 10);
      const { data, error } = await supabase.rpc("request_public_booking", {
        _token: token,
        _start: range.start!,
        _end: range.end!,
        _guests: Number.isFinite(n) ? n : 0,
        ...(note.trim() ? { _note: note.trim() } : {}),
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (result) => {
      const [cs, en] = publicRequestMessage(result);
      setMessage({ ok: result === "ok", text: lang === "en" ? en : cs });
      if (result === "ok") {
        track("booking_request_sent", { source: "public_calendar", guests: Number(guests) || 0 });
        setRange({ start: null, end: null });
        setNote("");
        setOpen(false);
        void queryClient.invalidateQueries({ queryKey: ["my-public-requests", token] });
      }
    },
    onError: (error) => {
      console.error("[public-calendar] request_public_booking", error);
      setMessage({
        ok: false,
        text: t(
          "Žádost se nepodařilo odeslat. Zkuste to prosím znovu.",
          "The request could not be sent. Please try again.",
        ),
      });
    },
  });

  const startSignUp = () => {
    savePendingCalendar(token);
    track("booking_request_sign_up_start", { source: "public_calendar" });
    void navigate({ to: "/auth" });
  };

  const statusChip = (status: string) =>
    status === "APPROVED" ? (
      <span className="pill bg-primary-soft text-primary">
        <Check className="size-4" /> {t("Schváleno", "Approved")}
      </span>
    ) : status === "DECLINED" ? (
      <span className="pill bg-secondary text-muted-foreground">
        <X className="size-4" /> {t("Zamítnuto", "Declined")}
      </span>
    ) : (
      <span className="pill bg-warn-soft text-foreground">
        <Clock className="size-4" /> {t("Čeká na správce", "Waiting for an admin")}
      </span>
    );

  return (
    <section className="card mt-4 p-4" aria-labelledby="public-request-title">
      <h2 id="public-request-title" className="text-lg font-bold">
        {t("Chcete tu pobývat?", "Would you like to stay here?")}
      </h2>
      <p className="mt-1 text-[16px] text-muted-foreground">
        {t(
          `Pošlete žádost o termín. Správci chaty ${propertyName} ji schválí, nebo zamítnou.`,
          `Send a request for your dates. The admins of ${propertyName} approve or decline it.`,
        )}
      </p>

      {user === null && (
        <>
          <Button
            variant="fresh"
            size="fresh"
            className="btn-primary mt-3 w-full"
            onClick={startSignUp}
          >
            <CalendarPlus className="size-5" /> {t("Požádat o termín", "Request a booking")}
          </Button>
          <p className="mt-2 text-[14px] text-muted-foreground">
            {t(
              "Nejdřív si založíte účet a potvrdíte e-mail. Pak vás vrátíme sem a žádost dokončíte.",
              "First you create an account and confirm your email. Then we bring you back here to finish the request.",
            )}
          </p>
        </>
      )}

      {user && !open && (
        <Button
          variant="fresh"
          size="fresh"
          className="btn-primary mt-3 w-full"
          onClick={() => {
            setMessage(null);
            setOpen(true);
          }}
        >
          <CalendarPlus className="size-5" /> {t("Požádat o termín", "Request a booking")}
        </Button>
      )}

      {user && open && (
        <div className="mt-3 space-y-3">
          <p className="text-[16px]">
            {t(
              "Klepněte na den příjezdu, pak na den odjezdu.",
              "Tap your arrival day, then your departure day.",
            )}
          </p>
          <MonthHeader {...nav} />
          <CalendarMonth
            year={nav.year}
            month={nav.month}
            bookings={bookings}
            selection={range}
            onPickDay={(iso) => setRange((r) => pickRange(r, iso))}
          />
          <CalendarLegend picking />
          <p className="text-[16px] font-semibold">
            {t("Příjezd", "Arrival")}: {range.start ? fmtDate(range.start) : "—"} ·{" "}
            {t("Odjezd", "Departure")}: {range.end ? fmtDate(range.end) : "—"}
          </p>
          <label className="block">
            <span className="text-[16px] font-bold">{t("Počet hostů", "Number of guests")}</span>
            <input
              className="field mt-1 w-full"
              type="number"
              inputMode="numeric"
              min={1}
              max={200}
              value={guests}
              onChange={(e) => setGuests(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="label-text">
              {t("Poznámka pro správce (nepovinné)", "Note for the admins (optional)")}
            </span>
            <textarea
              className="field min-h-20 w-full"
              value={note}
              maxLength={1000}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <div className="flex gap-2">
            <Button
              variant="fresh"
              size="fresh"
              className="btn-secondary flex-1"
              onClick={() => setOpen(false)}
            >
              {t("Zpět", "Back")}
            </Button>
            <Button
              variant="fresh"
              size="fresh"
              className="btn-primary flex-1"
              disabled={send.isPending || !range.start || !range.end}
              onClick={() => send.mutate()}
            >
              {send.isPending ? t("Odesílám…", "Sending…") : t("Odeslat žádost", "Send request")}
            </Button>
          </div>
        </div>
      )}

      {message && (
        <p
          role={message.ok ? "status" : "alert"}
          className={`mt-3 text-[16px] font-semibold ${message.ok ? "text-primary" : "text-destructive"}`}
        >
          {message.text}
        </p>
      )}

      {user && mine.isError && (
        <p className="mt-3 text-[16px] text-destructive" role="alert">
          {t("Vaše žádosti se nepodařilo načíst.", "Your requests could not be loaded.")}
        </p>
      )}
      {user && !!mine.data?.length && (
        <div className="mt-4">
          <h3 className="mb-2 text-[16px] font-bold">{t("Vaše žádosti", "Your requests")}</h3>
          <ul className="space-y-2">
            {mine.data.map((r) => (
              <li key={r.id} className="rounded-2xl border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[16px] font-bold">
                    {fmtDate(r.start_date)} – {fmtDate(r.end_date)}
                  </p>
                  {statusChip(r.status)}
                </div>
                <p className="mt-1 text-[14px] text-muted-foreground">
                  {t("Požádáno", "Requested")} {fmtDateTime(r.created_at)}
                </p>
                {r.decided_at && (
                  <p className="text-[14px] text-muted-foreground">
                    {r.status === "APPROVED"
                      ? t("Schválil(a)", "Approved by")
                      : t("Zamítl(a)", "Declined by")}{" "}
                    {r.decided_by_name ?? t("správce", "an admin")} · {fmtDateTime(r.decided_at)}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

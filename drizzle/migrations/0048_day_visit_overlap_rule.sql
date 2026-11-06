-- 0048: day visits count in the overlap rule (T-067, tracker O-30, PR #104 review).
-- overlap_peak_guests (0028) counted another stay on a night only while night < end_date, so a
-- day visit (end_date = start_date, 0044) was never on any night: a member's booking on a day
-- someone else had a day visit was never held for approval, and two day visits on one day
-- never met. As in 0044's clash test, a 0-night stay now counts as [day, day + 1). A stay's
-- departure day stays free (same-day changeover). Only this function changes; booking_defaults
-- (0032) already passes a day visit's own day. Grants restated.
create or replace function public.overlap_peak_guests(_property_id uuid, _start date, _end date, _except uuid)
returns int language sql stable security definer set search_path = public as $$
  select coalesce(max(night_guests), 0)::int from (
    select d::date as night, sum(coalesce(b.guests, 1)) as night_guests
    from generate_series(_start, greatest(_start, _end - 1), interval '1 day') as d
    join public.bookings b
      on b.property_id = _property_id
     and b.status in ('CONFIRMED', 'PENDING')
     and b.id is distinct from _except
     and b.start_date <= d::date and d::date < greatest(b.end_date, b.start_date + 1)
    group by d
  ) nights
$$;
--> statement-breakpoint
revoke execute on function public.overlap_peak_guests(uuid, date, date, uuid) from public, anon, authenticated;

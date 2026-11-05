-- 0044: day visits (0 nights) from the public calendar (T-062, tracker O-24).
-- Decision 5 Nov 2026: families and organisations may book a stay that leaves on its arrival day.
-- The app and the organisation request form (0012) already allowed it; request_public_booking
-- (0034) still refused departure = arrival with 'dates', after the calendar let the visitor pick it.
-- request_public_booking: departure on the arrival day now passes. A day visit takes its whole
-- day, so in both functions a 0-night stay (requested or confirmed) counts as [day, day + 1) when
-- looking for a clash: two day visits on one day, or a day visit on the day a stay runs, are
-- 'busy' / 'dates_taken' (PR #104 review). A stay's departure day stays free (same-day changeover).
-- decide_guest_request: unchanged apart from that clash test. Grants restated.
create or replace function public.request_public_booking(
  _token text, _start date, _end date, _guests int, _note text default null
)
returns text language plpgsql security definer set search_path = public as $$
declare prop public.properties; acct_type text; who auth.users; display text;
begin
  if auth.uid() is null then return 'sign_in'; end if;
  select * into prop from public.properties where public_token = _token;
  if not found or not prop.public_calendar_enabled then return 'link'; end if;
  if exists (select 1 from public.members where account_id = prop.account_id and user_id = auth.uid()) then
    return 'member';  -- members book inside the app
  end if;
  select * into who from auth.users where id = auth.uid();
  if not found then return 'sign_in'; end if;
  if who.email_confirmed_at is null then return 'unconfirmed'; end if;
  if not public.feature_enabled('guest_requests') then return 'disabled'; end if;
  if _start is null or _end is null or _end < _start or _start < current_date
     or _end > current_date + 730 then
    return 'dates';
  end if;
  select type into acct_type from public.accounts where id = prop.account_id;
  if _guests is null or _guests < 1 or _guests > (case when acct_type = 'INSTITUTIONAL' then 200 else 50 end) then
    return 'guests';
  end if;
  -- Same-day changeover is not an overlap (as in 0028).
  if exists (select 1 from public.bookings b
             where b.property_id = prop.id and b.status = 'CONFIRMED'
               and b.start_date < greatest(_end, _start + 1)
               and greatest(b.end_date, b.start_date + 1) > _start) then
    return 'busy';
  end if;
  if (select count(*) from public.guest_requests
      where requester_user_id = auth.uid() and created_at > now() - interval '1 day') >= 3
     or (select count(*) from public.guest_requests
         where property_id = prop.id and source = 'public_calendar'
           and created_at > now() - interval '1 day') >= 20 then
    return 'rate';
  end if;
  if exists (select 1 from public.guest_requests
             where requester_user_id = auth.uid() and property_id = prop.id and status = 'PENDING'
               and start_date = _start and end_date = _end) then
    return 'duplicate';
  end if;
  display := coalesce(
    nullif(trim((select display_name from public.profiles where user_id = auth.uid())), ''),
    split_part(who.email, '@', 1));
  insert into public.guest_requests (guest_link_id, property_id, guest_name, guest_email, start_date,
                                     end_date, guests, note, status, source, requester_user_id)
  values (null, prop.id, left(display, 120), who.email, _start, _end, _guests, left(_note, 1000),
          'PENDING', 'public_calendar', auth.uid());
  return 'ok';
end;
$$;
--> statement-breakpoint
revoke execute on function public.request_public_booking(text, date, date, int, text) from public, anon;
--> statement-breakpoint
grant execute on function public.request_public_booking(text, date, date, int, text) to authenticated;
--> statement-breakpoint
create or replace function public.decide_guest_request(_request_id uuid, _approve boolean)
returns uuid language plpgsql security definer set search_path = public as $$
declare req public.guest_requests; acct uuid; new_booking uuid;
begin
  select * into req from public.guest_requests where id = _request_id for update;
  if not found then raise exception 'request_not_found' using errcode = '22023'; end if;
  select account_id into acct from public.properties where id = req.property_id;
  if acct is null or not public.has_account_role(acct, 'admin') then
    raise exception 'Admin role required' using errcode = '42501';
  end if;
  if req.status <> 'PENDING' then raise exception 'already_decided' using errcode = '22023'; end if;
  if _approve then
    -- Another stay may have been confirmed for these days since the request (PR #66 review).
    if exists (select 1 from public.bookings b
               where b.property_id = req.property_id and b.status = 'CONFIRMED'
                 and b.start_date < greatest(req.end_date, req.start_date + 1)
                 and greatest(b.end_date, b.start_date + 1) > req.start_date) then
      raise exception 'dates_taken' using errcode = '22023';
    end if;
    -- Inserted as held, then confirmed, so the approval stamp names this admin.
    insert into public.bookings (property_id, requester_name, requester_member_id, start_date,
                                 end_date, guests, note, status)
    values (req.property_id, req.guest_name, null, req.start_date, req.end_date, req.guests,
            req.note, 'PENDING')
    returning id into new_booking;
    update public.bookings set status = 'CONFIRMED' where id = new_booking;
  end if;
  update public.guest_requests
  set status = case when _approve then 'APPROVED' else 'DECLINED' end, booking_id = new_booking
  where id = req.id;
  return new_booking;
end;
$$;
--> statement-breakpoint
revoke execute on function public.decide_guest_request(uuid, boolean) from public, anon;
--> statement-breakpoint
grant execute on function public.decide_guest_request(uuid, boolean) to authenticated;

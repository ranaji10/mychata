-- 0044: day visits (0 nights) from the public calendar (T-062, tracker O-24).
-- Decision 5 Nov 2026: families and organisations may book a stay that leaves on its arrival day.
-- The app and the organisation request form (0012) already allowed it; request_public_booking
-- (0034) still refused departure = arrival with 'dates', after the calendar let the visitor pick it.
-- Same function, one condition changed: departure on the arrival day now passes; grants restated.
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
               and b.start_date < _end and b.end_date > _start) then
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

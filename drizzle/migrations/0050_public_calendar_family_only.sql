-- 0050: the public calendar is for family cottages only (T-069, tracker F-34, decided 9 Nov 2026,
-- ADR-0014). Since 29 Sep the app offers the public calendar to families only, but the database
-- still served it for institutions, and onboarding (0040) even switched the flag ON for every new
-- institution because the employee request form read its taken dates through public_calendar. So
-- an institution's request-form token also opened its calendar (/verejne/kalendar/ instead of
-- /verejne/zadost/) and took booking requests its admin could neither see nor switch off.
-- Decision: no public calendar for institutions; it can come back if institutions ask for it.
-- 1. public_request_availability(token): dates and status only, for the institution request form,
--    so the form keeps its "these dates are partly taken" warning without the calendar flag.
-- 2. A trigger keeps the flag off when an institution cottage is created or its flag written
--    (onboarding, Settings, direct writes); then the flag is switched off on every existing
--    institution cottage (the token is kept: the request form uses it). A family that becomes an
--    institution (change_account_type) keeps its flag, but step 4 ignores it.
-- 3. set_public_calendar refuses to switch it on for an institution ('family_only').
-- 4. public_calendar, public_property and request_public_booking treat an institution cottage as
--    switched off whatever the flag says.
-- The previous app keeps working: its request form reads public_calendar, which now returns no
-- dates for institutions, so until publish the form shows no taken-dates warning (the admin
-- still sees has_conflict).
create or replace function public.public_request_availability(_token text)
returns table (start_date date, end_date date, status text)
language sql stable security definer set search_path = public as $$
  select b.start_date, b.end_date, b.status
  from public.properties p
  join public.accounts a on a.id = p.account_id and a.type = 'INSTITUTIONAL'
  join public.bookings b on b.property_id = p.id and b.status in ('CONFIRMED', 'PENDING')
  where p.public_token = _token
    and b.end_date >= current_date - 1
  order by b.start_date
$$;
--> statement-breakpoint
revoke execute on function public.public_request_availability(text) from public;
--> statement-breakpoint
grant execute on function public.public_request_availability(text) to anon, authenticated;
--> statement-breakpoint
create or replace function public.calendar_family_only()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.public_calendar_enabled
     and exists (select 1 from public.accounts a
                 where a.id = new.account_id and a.type = 'INSTITUTIONAL') then
    new.public_calendar_enabled := false;
  end if;
  return new;
end;
$$;
--> statement-breakpoint
revoke execute on function public.calendar_family_only() from public, anon, authenticated;
--> statement-breakpoint
drop trigger if exists properties_calendar_family_only on public.properties;
--> statement-breakpoint
create trigger properties_calendar_family_only
  before insert or update of public_calendar_enabled, account_id on public.properties
  for each row execute function public.calendar_family_only();
--> statement-breakpoint
update public.properties p set public_calendar_enabled = false
from public.accounts a
where a.id = p.account_id and a.type = 'INSTITUTIONAL' and p.public_calendar_enabled;
--> statement-breakpoint
create or replace function public.set_public_calendar(_property_id uuid, _enabled boolean)
returns text language plpgsql security definer set search_path = public as $$
declare tok text;
begin
  if not exists (select 1 from public.properties p
                 where p.id = _property_id and public.has_account_role(p.account_id, 'admin')) then
    raise exception 'Admin role required' using errcode = '42501';
  end if;
  if _enabled and exists (select 1 from public.properties p join public.accounts a on a.id = p.account_id
                          where p.id = _property_id and a.type = 'INSTITUTIONAL') then
    raise exception 'family_only' using errcode = 'P0001';
  end if;
  update public.properties set public_calendar_enabled = _enabled where id = _property_id
  returning public_token into tok;
  return tok;
end;
$$;
--> statement-breakpoint
revoke execute on function public.set_public_calendar(uuid, boolean) from public, anon;
--> statement-breakpoint
grant execute on function public.set_public_calendar(uuid, boolean) to authenticated;
--> statement-breakpoint
create or replace function public.public_calendar(_token text)
returns table (property_name text, start_date date, end_date date, status text)
language sql stable security definer set search_path = public as $$
  select p.name, b.start_date, b.end_date, b.status
  from public.properties p
  join public.accounts a on a.id = p.account_id and a.type = 'FAMILY'
  join public.bookings b on b.property_id = p.id and b.status in ('CONFIRMED', 'PENDING')
  where p.public_token = _token and p.public_calendar_enabled
    and b.end_date >= current_date - 1
  order by b.start_date
$$;
--> statement-breakpoint
create or replace function public.public_property(_token text)
returns table (property_name text, calendar_enabled boolean, is_institution boolean)
language sql stable security definer set search_path = public as $$
  select p.name, p.public_calendar_enabled and a.type = 'FAMILY', a.type = 'INSTITUTIONAL'
  from public.properties p join public.accounts a on a.id = p.account_id
  where p.public_token = _token
$$;
--> statement-breakpoint
grant execute on function public.public_calendar(text) to anon, authenticated;
--> statement-breakpoint
grant execute on function public.public_property(text) to anon, authenticated;
--> statement-breakpoint
create or replace function public.request_public_booking(
  _token text, _start date, _end date, _guests int, _note text default null
)
returns text language plpgsql security definer set search_path = public as $$
declare prop public.properties; acct_type text; who auth.users; display text;
begin
  if auth.uid() is null then return 'sign_in'; end if;
  select * into prop from public.properties where public_token = _token;
  if not found or not prop.public_calendar_enabled then return 'link'; end if;
  -- 0050: family cottages only.
  select type into acct_type from public.accounts where id = prop.account_id;
  if acct_type is distinct from 'FAMILY' then return 'link'; end if;
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
  if _guests is null or _guests < 1 or _guests > 50 then
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

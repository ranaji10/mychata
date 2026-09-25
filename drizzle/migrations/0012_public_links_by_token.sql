-- 0012 Public pages by unguessable token, not by property id (defects 3, 4, 6, 8)
-- Before: anyone with the publishable key could list every PUBLIC manual section of every
-- property, and read any property's address and booked dates from its id.
-- After: public pages take a per-property share token; the calendar is public only when
-- an admin switches it on; all anonymous writes go through checked functions.

-- Institutional properties already relied on a public request form.
update public.properties p set public_calendar_enabled = true
from public.accounts a where a.id = p.account_id and a.type = 'INSTITUTIONAL';

-- Close direct anonymous table access -------------------------------------------
drop policy if exists "Public can read public manual sections" on public.manual_sections;
revoke select on public.manual_sections from anon;
drop policy if exists "Public can flag manual sections" on public.manual_feedback;
revoke insert on public.manual_feedback from anon;
drop policy if exists "Public submits requests" on public.institutional_requests;
revoke insert, select, update, delete on public.institutional_requests from anon;

alter table public.manual_sections alter column visibility set default 'MEMBERS_ONLY';

drop function if exists public.public_property_details(uuid);
drop function if exists public.public_booking_availability(uuid);
drop function if exists public.public_institutional_property();

-- Read functions for public pages ------------------------------------------------

create or replace function public.public_calendar(_token text)
returns table (property_name text, start_date date, end_date date, status text)
language sql stable security definer set search_path = public as $$
  select p.name, b.start_date, b.end_date, b.status
  from public.properties p
  join public.bookings b on b.property_id = p.id and b.status in ('CONFIRMED', 'PENDING')
  where p.public_token = _token and p.public_calendar_enabled
    and b.end_date >= current_date - 1
  order by b.start_date
$$;

create or replace function public.public_property(_token text)
returns table (property_name text, calendar_enabled boolean, is_institution boolean)
language sql stable security definer set search_path = public as $$
  select p.name, p.public_calendar_enabled, a.type = 'INSTITUTIONAL'
  from public.properties p join public.accounts a on a.id = p.account_id
  where p.public_token = _token
$$;

create or replace function public.public_manual(_token text)
returns table (id uuid, category text, title_cs text, title_en text, content_cs text,
               content_en text, photo_url text, display_order int)
language sql stable security definer set search_path = public as $$
  select s.id, s.category, s.title_cs, s.title_en, s.content_cs, s.content_en, s.photo_url, s.display_order
  from public.manual_sections s join public.properties p on p.id = s.property_id
  where p.public_token = _token and s.visibility = 'PUBLIC'
  order by s.display_order, s.created_at
$$;

create or replace function public.public_flag_manual_section(_token text, _section_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare ok boolean;
begin
  select true into ok from public.manual_sections s join public.properties p on p.id = s.property_id
  where p.public_token = _token and s.id = _section_id and s.visibility = 'PUBLIC';
  if ok is null then return false; end if;
  -- Cap open flags per section so the form can't be used to flood admins.
  if (select count(*) from public.manual_feedback where section_id = _section_id and status = 'OPEN') >= 20 then
    return true;
  end if;
  insert into public.manual_feedback (section_id, status) values (_section_id, 'OPEN');
  return true;
end;
$$;

-- Guest links (family "book without an account") ------------------------------------

create or replace function public.public_guest_availability(_token text)
returns table (start_date date, end_date date, status text)
language sql stable security definer set search_path = public as $$
  select b.start_date, b.end_date, b.status
  from public.guest_links gl
  join public.bookings b on b.property_id = gl.property_id and b.status in ('CONFIRMED', 'PENDING')
  where gl.token = _token and gl.revoked_at is null
    and (gl.expires_at is null or gl.expires_at > now())
    and b.end_date >= current_date - 1
  order by b.start_date
$$;

create or replace function public.submit_guest_request(
  _token text, _name text, _email text, _start date, _end date, _guests int, _note text default null
)
returns text language plpgsql security definer set search_path = public as $$
declare link public.guest_links;
begin
  select * into link from public.guest_links
  where token = _token and revoked_at is null and (expires_at is null or expires_at > now());
  if not found then return 'link'; end if;
  if _end < _start or _start < current_date - 1 then return 'dates'; end if;
  if link.valid_from is not null and _start < link.valid_from then return 'dates'; end if;
  if link.valid_to is not null and _end > link.valid_to then return 'dates'; end if;
  if _guests < 1 or _guests > 50 then return 'guests'; end if;
  if length(coalesce(_name, '')) not between 2 and 120 then return 'name'; end if;
  if coalesce(_email, '') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(_email) > 200 then return 'email'; end if;
  -- Rate limits: 10 requests per link per day, 3 per email per day.
  if (select count(*) from public.guest_requests
      where guest_link_id = link.id and created_at > now() - interval '1 day') >= 10 then
    return 'rate';
  end if;
  if (select count(*) from public.guest_requests
      where lower(guest_email) = lower(_email) and created_at > now() - interval '1 day') >= 3 then
    return 'rate';
  end if;
  insert into public.guest_requests (guest_link_id, property_id, guest_name, guest_email, start_date,
                                     end_date, guests, note, status)
  values (link.id, link.property_id, _name, _email, _start, _end, _guests, left(_note, 1000), 'PENDING');
  return 'ok';
end;
$$;

-- Institutional public request form -------------------------------------------------

create or replace function public.submit_institutional_request(
  _token text, _name text, _email text, _phone text, _affiliation text,
  _start date, _end date, _guests int, _note text default null
)
returns text language plpgsql security definer set search_path = public as $$
declare prop uuid; conflicts text;
begin
  select p.id into prop from public.properties p join public.accounts a on a.id = p.account_id
  where p.public_token = _token and a.type = 'INSTITUTIONAL';
  if prop is null then return 'link'; end if;
  if _end < _start or _start < current_date - 1 then return 'dates'; end if;
  if _guests < 1 or _guests > 200 then return 'guests'; end if;
  if length(coalesce(_name, '')) not between 2 and 120 then return 'name'; end if;
  if coalesce(_email, '') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(_email) > 200 then return 'email'; end if;
  if (select count(*) from public.institutional_requests
      where property_id = prop and created_at > now() - interval '1 day') >= 50 then
    return 'rate';
  end if;
  if (select count(*) from public.institutional_requests
      where lower(requester_email) = lower(_email) and created_at > now() - interval '1 day') >= 3 then
    return 'rate';
  end if;
  select string_agg(to_char(b.start_date, 'DD.MM.') || '–' || to_char(b.end_date, 'DD.MM.YYYY'), ', ')
    into conflicts
  from public.bookings b
  where b.property_id = prop and b.status in ('CONFIRMED', 'PENDING')
    and b.start_date < _end and _start < b.end_date;
  insert into public.institutional_requests (property_id, requester_name, requester_email, requester_phone,
    affiliation, start_date, end_date, guests, note, status, has_conflict, conflict_note)
  values (prop, _name, _email, nullif(_phone, ''), nullif(_affiliation, ''), _start, _end, _guests,
          left(_note, 1000), 'PENDING', conflicts is not null, conflicts);
  return 'ok';
end;
$$;

-- Admin controls for share links --------------------------------------------------

create or replace function public.set_public_calendar(_property_id uuid, _enabled boolean)
returns text language plpgsql security definer set search_path = public as $$
declare tok text;
begin
  if not exists (select 1 from public.properties p
                 where p.id = _property_id and public.has_account_role(p.account_id, 'admin')) then
    raise exception 'Admin role required' using errcode = '42501';
  end if;
  update public.properties set public_calendar_enabled = _enabled where id = _property_id
  returning public_token into tok;
  return tok;
end;
$$;

create or replace function public.rotate_public_token(_property_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare tok text;
begin
  if not exists (select 1 from public.properties p
                 where p.id = _property_id and public.has_account_role(p.account_id, 'admin')) then
    raise exception 'Admin role required' using errcode = '42501';
  end if;
  update public.properties set public_token = encode(gen_random_bytes(16), 'hex') where id = _property_id
  returning public_token into tok;
  return tok;
end;
$$;

revoke execute on function public.public_calendar(text) from public;
revoke execute on function public.public_property(text) from public;
revoke execute on function public.public_manual(text) from public;
revoke execute on function public.public_flag_manual_section(text, uuid) from public;
revoke execute on function public.public_guest_availability(text) from public;
revoke execute on function public.submit_guest_request(text, text, text, date, date, int, text) from public;
revoke execute on function public.submit_institutional_request(text, text, text, text, text, date, date, int, text) from public;
revoke execute on function public.set_public_calendar(uuid, boolean) from public, anon;
revoke execute on function public.rotate_public_token(uuid) from public, anon;
grant execute on function public.public_calendar(text) to anon, authenticated;
grant execute on function public.public_property(text) to anon, authenticated;
grant execute on function public.public_manual(text) to anon, authenticated;
grant execute on function public.public_flag_manual_section(text, uuid) to anon, authenticated;
grant execute on function public.public_guest_availability(text) to anon, authenticated;
grant execute on function public.submit_guest_request(text, text, text, date, date, int, text) to anon, authenticated;
grant execute on function public.submit_institutional_request(text, text, text, text, text, date, date, int, text) to anon, authenticated;
grant execute on function public.set_public_calendar(uuid, boolean) to authenticated;
grant execute on function public.rotate_public_token(uuid) to authenticated;

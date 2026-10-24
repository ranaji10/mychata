-- 0034: booking requests from the public calendar, and who approved what (T-043, ADR-0011).
--
-- Request of 25 Oct 2026: the public calendar link gets "Request a booking". The visitor
-- signs up (or in), confirms their email, comes back to the same link and sends the request.
-- It always waits for an admin. Requester and admins see when it was requested and who
-- decided it, and approved stays show who approved them.
--
-- 1. guest_requests: a request may come from the public calendar (no guest link) by a
--    signed-in person; it records who decided it, when, and the booking it became.
-- 2. bookings: approved_by_member_id / approved_at, stamped by the database only.
-- 3. request_public_booking(token, ...): signed-in, email confirmed, not a member of the
--    account, calendar published, dates free of confirmed stays, rate limited.
-- 4. my_public_booking_requests(token): the caller's own requests for that cottage.
-- 5. decide_guest_request: same rules as 0022, plus an overlap re-check and the approver.
-- 6. guest_requests readable by admins only (visitor e-mails).
-- Safe to run once on a database with data: only adds nullable columns and a default.

-- 1. Guest requests ------------------------------------------------------------------------
alter table public.guest_requests alter column guest_link_id drop not null;
alter table public.guest_requests
  add column if not exists source text not null default 'guest_link',
  add column if not exists requester_user_id uuid references auth.users (id) on delete set null,
  add column if not exists decided_by_member_id uuid references public.members (id) on delete set null,
  add column if not exists decided_at timestamptz,
  add column if not exists booking_id uuid references public.bookings (id) on delete set null;
alter table public.guest_requests drop constraint if exists guest_requests_source_check;
alter table public.guest_requests
  add constraint guest_requests_source_check check (source in ('guest_link', 'public_calendar'));
create index if not exists guest_requests_requester_idx
  on public.guest_requests (requester_user_id) where requester_user_id is not null;

-- Who decided and when is written by the database, never by the caller (admins can still
-- update the row directly through the 0007 policy).
create or replace function public.guest_request_decision_stamp()
returns trigger language plpgsql security definer set search_path = public as $$
declare acct uuid;
begin
  new.source := old.source;
  new.requester_user_id := old.requester_user_id;
  if old.status = 'PENDING' and new.status <> 'PENDING' then
    select account_id into acct from public.properties where id = new.property_id;
    new.decided_at := now();
    new.decided_by_member_id := (select id from public.members
                                 where account_id = acct and user_id = auth.uid() limit 1);
  else
    new.decided_at := old.decided_at;
    new.decided_by_member_id := old.decided_by_member_id;
  end if;
  return new;
end;
$$;
revoke execute on function public.guest_request_decision_stamp() from public, anon, authenticated;
drop trigger if exists guest_requests_decision_stamp on public.guest_requests;
create trigger guest_requests_decision_stamp before update on public.guest_requests
  for each row execute function public.guest_request_decision_stamp();

-- 2. Who approved a booking -----------------------------------------------------------------
alter table public.bookings
  add column if not exists approved_by_member_id uuid references public.members (id) on delete set null,
  add column if not exists approved_at timestamptz;

create or replace function public.booking_approval_stamp()
returns trigger language plpgsql security definer set search_path = public as $$
declare acct uuid; me uuid;
begin
  select account_id into acct from public.properties where id = new.property_id;
  me := (select id from public.members where account_id = acct and user_id = auth.uid() limit 1);
  if tg_op = 'INSERT' then
    -- Nobody is "the approver" of a booking made in one step (PR #66 review): approval is a
    -- change from PENDING to CONFIRMED, which decide_guest_request also goes through.
    new.approved_by_member_id := null;
    new.approved_at := null;
  elsif old.status = 'PENDING' and new.status = 'CONFIRMED' then
    new.approved_by_member_id := me;
    new.approved_at := now();
  elsif new.status = 'CONFIRMED' then
    new.approved_by_member_id := old.approved_by_member_id;
    new.approved_at := old.approved_at;
  else
    new.approved_by_member_id := null;
    new.approved_at := null;
  end if;
  return new;
end;
$$;
revoke execute on function public.booking_approval_stamp() from public, anon, authenticated;
drop trigger if exists bookings_approval_stamp on public.bookings;
-- "zz" so it runs after bookings' other before-triggers (booking_defaults may hold a stay).
create trigger zz_bookings_approval_stamp before insert or update on public.bookings
  for each row execute function public.booking_approval_stamp();

-- 3. A signed-in visitor asks through the public calendar ------------------------------------
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
  if _start is null or _end is null or _end <= _start or _start < current_date
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
revoke execute on function public.request_public_booking(text, date, date, int, text) from public, anon;
grant execute on function public.request_public_booking(text, date, date, int, text) to authenticated;

-- 4. The visitor's own requests for this cottage ----------------------------------------------
create or replace function public.my_public_booking_requests(_token text)
returns table (id uuid, start_date date, end_date date, guests int, note text, status text,
               created_at timestamptz, decided_at timestamptz, decided_by_name text)
language sql stable security definer set search_path = public as $$
  select r.id, r.start_date, r.end_date, r.guests, r.note, r.status, r.created_at, r.decided_at,
         m.name
  from public.guest_requests r
  join public.properties p on p.id = r.property_id
  left join public.members m on m.id = r.decided_by_member_id
  where p.public_token = _token and auth.uid() is not null and r.requester_user_id = auth.uid()
  order by r.created_at desc
  limit 20
$$;
revoke execute on function public.my_public_booking_requests(text) from public, anon;
grant execute on function public.my_public_booking_requests(text) to authenticated;

-- 5. Deciding: as in 0022, plus the approver on the booking and the booking on the request ----
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
                 and b.start_date < req.end_date and b.end_date > req.start_date) then
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
revoke execute on function public.decide_guest_request(uuid, boolean) from public, anon;
grant execute on function public.decide_guest_request(uuid, boolean) to authenticated;

-- 6. Visitors' e-mails are for the admins who decide (PR #66 review): members no longer read
--    guest requests. The app only ever read them as an admin (Home, Calendar, Notifications).
drop policy if exists "Members read own account guest requests" on public.guest_requests;
drop policy if exists "Admins read guest requests" on public.guest_requests;
create policy "Admins read guest requests" on public.guest_requests for select to authenticated
  using (exists (select 1 from public.properties p
                 where p.id = property_id and public.has_account_role(p.account_id, 'admin')));

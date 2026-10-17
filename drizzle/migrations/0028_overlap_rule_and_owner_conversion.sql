-- T-036 (release check of 17 Oct 2026).
-- 1. "May stays overlap? No" was stored (0026) but never used: a member's overlapping booking
--    was still confirmed straight away. A plain member's own booking now waits for an admin
--    when it overlaps another confirmed or pending stay and the cottage said "No", or when the
--    guests of the overlapping stays together exceed the saved limit (overlap_max_guests).
--    Guests are counted per night. Same-day changeovers are not overlaps. The rule also runs on
--    UPDATE: a plain member cannot approve their own held booking, hand it to someone else, or
--    move confirmed dates onto another stay; a null requester counts as their own booking
--    (release-check review and RLS audit of 18 Oct).
-- 2. Decision of 17 Oct: only the account's owner turns a family account into an
--    organisation's. There is no OWNER role in practice (founders are ADMIN), so the owner is
--    the account's founding member: the oldest member row with a sign-in. Another admin can no
--    longer demote the founder (the founder may still step down themselves).

-- 1. Overlap rule ---------------------------------------------------------------------------
-- Highest number of guests on any single night of [_start, _end) at a cottage, from confirmed
-- and pending stays other than _except. Internal: called only by booking_defaults().
create or replace function public.overlap_peak_guests(_property_id uuid, _start date, _end date, _except uuid)
returns int language sql stable security definer set search_path = public as $$
  select coalesce(max(night_guests), 0)::int from (
    select d::date as night, sum(b.guests) as night_guests
    from generate_series(_start, greatest(_start, _end - 1), interval '1 day') as d
    join public.bookings b
      on b.property_id = _property_id
     and b.status in ('CONFIRMED', 'PENDING')
     and b.id is distinct from _except
     and b.start_date <= d::date and d::date < b.end_date
    group by d
  ) nights
$$;
revoke execute on function public.overlap_peak_guests(uuid, date, date, uuid) from public, anon, authenticated;

create or replace function public.booking_defaults()
returns trigger language plpgsql security definer set search_path = public as $$
declare acct_type text; auto boolean; me uuid; allowed boolean; max_guests int; peak int;
begin
  if auth.uid() is null then return new; end if;  -- definer functions and service jobs
  if public.is_admin() then
    -- Admins approve, edit and book for others; nothing is held back for them.
    if tg_op = 'INSERT' and coalesce(new.requester_name, '') = '' and new.requester_member_id is not null then
      select name into new.requester_name from public.members where id = new.requester_member_id;
    end if;
    return new;
  end if;
  me := public.current_member_id();
  select a.type, p.auto_confirm, p.overlap_allowed, p.overlap_max_guests
    into acct_type, auto, allowed, max_guests
  from public.properties p join public.accounts a on a.id = p.account_id
  where p.id = new.property_id;

  if tg_op = 'INSERT' then
    -- A plain member books only for themselves (row-level security allows a null requester).
    new.requester_member_id := coalesce(new.requester_member_id, me);
    if coalesce(new.requester_name, '') = '' and new.requester_member_id is not null then
      select name into new.requester_name from public.members where id = new.requester_member_id;
    end if;
  else
    -- Only an admin approves, hands a booking to someone else or moves it to another cottage.
    if old.status = 'PENDING' and new.status = 'CONFIRMED' then
      raise exception 'admin_approval_required' using errcode = '42501';
    end if;
    if new.requester_member_id is distinct from old.requester_member_id
       or new.property_id is distinct from old.property_id then
      raise exception 'Admin role required' using errcode = '42501';
    end if;
    -- Unchanged dates and guests: nothing to re-check.
    if new.start_date = old.start_date and new.end_date = old.end_date
       and new.guests is not distinct from old.guests then
      return new;
    end if;
  end if;

  if new.status = 'CONFIRMED' and new.requester_member_id is not distinct from me and me is not null then
    if acct_type = 'INSTITUTIONAL' or not coalesce(auto, true) then
      new.status := 'PENDING';
    elsif allowed is false or max_guests is not null then
      peak := public.overlap_peak_guests(new.property_id, new.start_date, new.end_date,
                                         case when tg_op = 'UPDATE' then old.id end);
      if peak > 0 and (allowed is false
                       or (max_guests is not null and peak + coalesce(new.guests, 1) > max_guests)) then
        new.status := 'PENDING';
      end if;
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function public.booking_defaults() from public, anon, authenticated;
drop trigger if exists bookings_defaults on public.bookings;
create trigger bookings_defaults before insert or update on public.bookings
  for each row execute function public.booking_defaults();

-- 2. Only the owner converts ----------------------------------------------------------------
-- The account's founding member: an OWNER row if one ever exists, else the oldest member with
-- a sign-in. Internal: called only by the definer functions below.
create or replace function public.account_founder(_account_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select user_id from public.members
  where account_id = _account_id and user_id is not null
  order by (role = 'OWNER') desc, created_at, id
  limit 1
$$;
revoke execute on function public.account_founder(uuid) from public, anon, authenticated;

create or replace function public.convert_account_to_institution(_account_id uuid, _name text)
returns void language plpgsql security definer set search_path = public as $$
declare caller_email text; domain text;
begin
  if not public.has_account_role(_account_id, 'admin') then
    raise exception 'Admin role required' using errcode = '42501';
  end if;
  if public.account_founder(_account_id) is distinct from auth.uid() then
    raise exception 'owner_required' using errcode = '42501';
  end if;
  if _name is null or length(trim(_name)) < 2 or length(trim(_name)) > 120 then
    raise exception 'bad_name';
  end if;
  caller_email := lower(coalesce(auth.jwt()->>'email', ''));
  domain := split_part(caller_email, '@', 2);
  -- Same list as src/lib/signup.ts PUBLIC_EMAIL_DOMAINS.
  if domain = '' or domain in ('gmail.com', 'googlemail.com', 'seznam.cz', 'centrum.cz', 'email.cz',
      'atlas.cz', 'volny.cz', 'post.cz', 'outlook.com', 'hotmail.com', 'live.com', 'yahoo.com',
      'icloud.com', 'me.com', 'proton.me', 'protonmail.com') then
    raise exception 'institution_email_required' using errcode = '42501';
  end if;
  update public.accounts set type = 'INSTITUTIONAL', name = trim(_name) where id = _account_id;
  insert into public.audit_log (account_id, actor_user_id, action, target_type, target_id, detail)
  values (_account_id, auth.uid(), 'account_converted', 'account', _account_id,
          jsonb_build_object('name', trim(_name)));
end;
$$;
revoke execute on function public.convert_account_to_institution(uuid, text) from public, anon;
grant execute on function public.convert_account_to_institution(uuid, text) to authenticated;

-- A co-admin could demote the founder, after which nobody could convert the account. Same
-- function as 0011 plus the founder check.
create or replace function public.set_member_role(_member_id uuid, _role text)
returns void language plpgsql security definer set search_path = public as $$
declare target public.members; remaining int;
begin
  if _role not in ('ADMIN', 'MEMBER') then raise exception 'bad_role'; end if;
  select * into target from public.members where id = _member_id for update;
  if not found then raise exception 'member_not_found'; end if;
  if not public.has_account_role(target.account_id, 'admin') then
    raise exception 'Admin role required' using errcode = '42501';
  end if;
  if target.role = 'OWNER' then raise exception 'owner_role_is_fixed'; end if;
  if _role = 'MEMBER' and target.role = 'ADMIN' then
    if target.user_id is not null
       and target.user_id = public.account_founder(target.account_id)
       and target.user_id is distinct from auth.uid() then
      raise exception 'founder_role_is_fixed' using errcode = '42501';
    end if;
    select count(*) into remaining from public.members
    where account_id = target.account_id and role in ('ADMIN', 'OWNER') and id <> target.id;
    if remaining = 0 then raise exception 'last_admin'; end if;
  end if;
  update public.members set role = _role where id = _member_id;
  if _role = 'MEMBER' then
    delete from public.property_admins where member_id = _member_id;
  end if;
end;
$$;
revoke execute on function public.set_member_role(uuid, text) from public, anon;
grant execute on function public.set_member_role(uuid, text) to authenticated;

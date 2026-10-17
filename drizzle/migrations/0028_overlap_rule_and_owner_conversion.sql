-- T-036 (release check of 17 Oct 2026).
-- 1. "May stays overlap? No" was stored (0026) but never used: a member's overlapping booking
--    was still confirmed straight away. A plain member's own booking now waits for an admin
--    when it overlaps another confirmed or pending stay and the cottage said "No", or when the
--    guests of the overlapping stays together exceed the saved limit (overlap_max_guests).
--    Same-day changeovers (one leaves the day the other arrives) are not overlaps.
-- 2. Decision of 17 Oct: only the account's owner turns a family account into an
--    organisation's. There is no OWNER role in practice (founders are ADMIN), so the owner is
--    the account's founding member: the oldest member row with a sign-in.

-- 1. Overlap rule ---------------------------------------------------------------------------
create or replace function public.booking_defaults()
returns trigger language plpgsql security definer set search_path = public as $$
declare acct_type text; auto boolean; me uuid; allowed boolean; max_guests int; overlap_guests int;
begin
  if auth.uid() is null then return new; end if;  -- definer functions and service jobs
  select a.type, p.auto_confirm, p.overlap_allowed, p.overlap_max_guests
    into acct_type, auto, allowed, max_guests
  from public.properties p join public.accounts a on a.id = p.account_id
  where p.id = new.property_id;
  if coalesce(new.requester_name, '') = '' and new.requester_member_id is not null then
    select name into new.requester_name from public.members where id = new.requester_member_id;
  end if;
  me := public.current_member_id();
  -- Only a plain member's own booking is held back. Bookings written for someone else (an
  -- approved request) and admins' bookings keep what was sent.
  if new.status = 'CONFIRMED' and new.requester_member_id is not distinct from me
     and me is not null and not public.is_admin() then
    if acct_type = 'INSTITUTIONAL' or not coalesce(auto, true) then
      new.status := 'PENDING';
    elsif allowed is false or max_guests is not null then
      select sum(b.guests) into overlap_guests
      from public.bookings b
      where b.property_id = new.property_id
        and b.status in ('CONFIRMED', 'PENDING')
        and b.start_date < new.end_date and new.start_date < b.end_date;
      if overlap_guests is not null
         and (allowed is false
              or (max_guests is not null and overlap_guests + coalesce(new.guests, 1) > max_guests)) then
        new.status := 'PENDING';
      end if;
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function public.booking_defaults() from public, anon, authenticated;

-- 2. Only the owner converts ----------------------------------------------------------------
create or replace function public.convert_account_to_institution(_account_id uuid, _name text)
returns void language plpgsql security definer set search_path = public as $$
declare caller_email text; domain text; founder uuid;
begin
  if not public.has_account_role(_account_id, 'admin') then
    raise exception 'Admin role required' using errcode = '42501';
  end if;
  select user_id into founder from public.members
  where account_id = _account_id and user_id is not null
  order by (role = 'OWNER') desc, created_at, id
  limit 1;
  if founder is distinct from auth.uid() then
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

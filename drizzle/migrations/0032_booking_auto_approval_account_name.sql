-- 0032 (T-042, requests of 18 Oct 2026).
-- 1. Auto booking approval for organisations. Until now every booking a plain member made in
--    an organisation's cottage waited for an admin. The admin now answers "Auto booking
--    approval: Yes / No" during onboarding (or, for organisations set up before this, once in
--    Members & permissions). accounts.booking_auto_approve: null = not decided yet (behaves
--    like No, as before), true = members' bookings are confirmed straight away (the overlap
--    rule of 0028 still holds them when it applies), false = they wait for an admin. An admin's
--    own booking is always confirmed, whatever the answer (unchanged). Families keep the
--    per-cottage properties.auto_confirm.
-- 2. bookings.auto_approved marks a booking that was confirmed on creation without an admin
--    deciding it (the booker's own stay), so Notifications can tell admins about it. Computed
--    here only; the client cannot set it.
-- 3. A family account must not carry the same name as its first cottage (bug 16 of 18 Oct: an
--    account "Chata Alfa" holding Alfa, Beta and Gama looked like Beta was inside Alfa).
--    create_account_onboarding refuses it, and rename_account lets an admin fix older accounts.
-- 4. invitation_preview and public_guest_link say whether the cottage is an organisation's, so
--    the invitation and guest pages use its blue (tracker F-04).

-- 1, 2. Columns ------------------------------------------------------------------------------
alter table public.accounts add column if not exists booking_auto_approve boolean;
alter table public.bookings add column if not exists auto_approved boolean not null default false;

-- Same function as 0028 with the organisation's answer and the auto_approved flag.
create or replace function public.booking_defaults()
returns trigger language plpgsql security definer set search_path = public as $$
declare acct_type text; acct_auto boolean; auto boolean; me uuid; allowed boolean; max_guests int; peak int;
begin
  if auth.uid() is null then return new; end if;  -- definer functions and service jobs
  me := public.current_member_id();
  if public.is_admin() then
    -- Admins approve, edit and book for others; nothing is held back for them.
    if tg_op = 'INSERT' and coalesce(new.requester_name, '') = '' and new.requester_member_id is not null then
      select name into new.requester_name from public.members where id = new.requester_member_id;
    end if;
  else
    select a.type, a.booking_auto_approve, p.auto_confirm, p.overlap_allowed, p.overlap_max_guests
      into acct_type, acct_auto, auto, allowed, max_guests
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
    end if;

    -- Unchanged dates and guests on an UPDATE: nothing to re-check.
    if new.status = 'CONFIRMED' and new.requester_member_id is not distinct from me and me is not null
       and not (tg_op = 'UPDATE' and new.start_date = old.start_date and new.end_date = old.end_date
                and new.guests is not distinct from old.guests) then
      if (acct_type = 'INSTITUTIONAL' and not coalesce(acct_auto, false))
         or (acct_type is distinct from 'INSTITUTIONAL' and not coalesce(auto, true)) then
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
  end if;

  -- Confirmed on creation for the booker themselves, with nobody deciding: auto-approved.
  if tg_op = 'INSERT' then
    new.auto_approved := new.status = 'CONFIRMED' and me is not null
                         and new.requester_member_id is not distinct from me;
  else
    new.auto_approved := old.auto_approved and new.status = 'CONFIRMED';
  end if;
  return new;
end;
$$;
revoke execute on function public.booking_defaults() from public, anon, authenticated;

-- 1. The organisation's answer -----------------------------------------------------------------
create or replace function public.set_booking_auto_approve(_account_id uuid, _enabled boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_account_role(_account_id, 'admin') then
    raise exception 'Admin role required' using errcode = '42501';
  end if;
  if _enabled is null then raise exception 'bad_value'; end if;
  if not exists (select 1 from public.accounts where id = _account_id and type = 'INSTITUTIONAL') then
    raise exception 'institution_only';
  end if;
  update public.accounts set booking_auto_approve = _enabled where id = _account_id;
  insert into public.audit_log (account_id, actor_user_id, action, target_type, target_id, detail)
  values (_account_id, auth.uid(), 'booking_auto_approve_set', 'account', _account_id,
          jsonb_build_object('enabled', _enabled));
end;
$$;
revoke execute on function public.set_booking_auto_approve(uuid, boolean) from public, anon;
grant execute on function public.set_booking_auto_approve(uuid, boolean) to authenticated;

-- 3. Account name ----------------------------------------------------------------------------
create or replace function public.rename_account(_account_id uuid, _name text)
returns void language plpgsql security definer set search_path = public as $$
declare acct_type text;
begin
  if not public.has_account_role(_account_id, 'admin') then
    raise exception 'Admin role required' using errcode = '42501';
  end if;
  if _name is null or length(trim(_name)) < 2 or length(trim(_name)) > 120 then
    raise exception 'bad_name';
  end if;
  select type into acct_type from public.accounts where id = _account_id;
  if acct_type = 'FAMILY' and exists (
    select 1 from public.properties
    where account_id = _account_id and lower(trim(name)) = lower(trim(_name))
  ) then
    raise exception 'account_name_same_as_cottage';
  end if;
  update public.accounts set name = trim(_name) where id = _account_id;
  insert into public.audit_log (account_id, actor_user_id, action, target_type, target_id, detail)
  values (_account_id, auth.uid(), 'account_renamed', 'account', _account_id,
          jsonb_build_object('name', trim(_name)));
end;
$$;
revoke execute on function public.rename_account(uuid, text) from public, anon;
grant execute on function public.rename_account(uuid, text) to authenticated;

-- Same function as 0011 plus the name check and the organisation's auto-approval answer.
-- The old signature goes so that calls with named arguments resolve to one function.
drop function if exists public.create_account_onboarding(text, text, text, text, text, int, text[], int, text);
create or replace function public.create_account_onboarding(
  _type text,
  _account_name text,
  _property_name text,
  _address text default '',
  _city text default null,
  _rooms int default null,
  _seasons text[] default '{}',
  _overlap_max_guests int default null,
  _house_rules text default '',
  _booking_auto_approve boolean default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare new_account uuid; new_property uuid; new_member uuid; caller_email text; display text;
begin
  if auth.uid() is null then raise exception 'not_signed_in' using errcode = '42501'; end if;
  if _type not in ('FAMILY', 'INSTITUTIONAL') then raise exception 'bad_type'; end if;
  if _type = 'FAMILY' and lower(trim(coalesce(_account_name, ''))) = lower(trim(coalesce(_property_name, ''))) then
    raise exception 'account_name_same_as_cottage';
  end if;
  caller_email := coalesce(auth.jwt()->>'email', '');
  select nullif(display_name, '') into display from public.profiles where user_id = auth.uid();

  insert into public.accounts (type, name, booking_auto_approve)
  values (_type, _account_name, case when _type = 'INSTITUTIONAL' then _booking_auto_approve end)
  returning id into new_account;
  insert into public.members (account_id, name, email, role, branch, user_id)
  values (new_account, coalesce(display, nullif(split_part(caller_email, '@', 1), ''), 'Admin'),
          caller_email, 'ADMIN', 'General', auth.uid())
  returning id into new_member;
  insert into public.properties (account_id, name, address, city, rooms, peak_seasons, overlap_max_guests,
                                 house_rules_text, auto_confirm, handover_items, created_by_member_id,
                                 public_calendar_enabled)
  values (new_account, _property_name, _address, _city, _rooms, _seasons, _overlap_max_guests,
          _house_rules, true, '[]'::jsonb, new_member, _type = 'INSTITUTIONAL')
  returning id into new_property;
  insert into public.property_admins (property_id, member_id) values (new_property, new_member)
  on conflict do nothing;
  insert into public.profiles (user_id, member_id, onboarding_completed_at, active_account_id)
  values (auth.uid(), new_member, now(), new_account)
  on conflict (user_id) do update
    set member_id = coalesce(public.profiles.member_id, excluded.member_id),
        onboarding_completed_at = now(),
        active_account_id = new_account;
  if _house_rules <> '' then
    insert into public.manual_sections (property_id, category, title_cs, title_en, content_cs, content_en, visibility, display_order)
    values (new_property, 'rules', 'Pravidla domu', 'House rules', _house_rules, _house_rules, 'PUBLIC', 0);
  end if;
  return new_property;
end;
$$;
revoke execute on function public.create_account_onboarding(text, text, text, text, text, int, text[], int, text, boolean) from public, anon;
grant execute on function public.create_account_onboarding(text, text, text, text, text, int, text[], int, text, boolean) to authenticated;

-- 4. Guest and invitation pages in the organisation's colour (tracker F-04) -----------------
-- They were always green: neither function said whether the cottage is an organisation's.
-- Same functions as 0007 and 0026 with one more column; the return type changes, so they are
-- dropped first. Anonymous callers learn only the flag the public calendar already shows.
drop function if exists public.invitation_preview(text);
create or replace function public.invitation_preview(_token text)
returns table (
  state text,
  account_name text,
  property_name text,
  role text,
  invited_by text,
  email_hint text,
  email_matches boolean,
  is_institution boolean
)
language plpgsql stable security definer set search_path = public as $$
declare inv public.invitations; caller_email text; is_group boolean := false; hints text;
begin
  caller_email := nullif(lower(coalesce(auth.jwt()->>'email', '')), '');
  select * into inv from public.invitations where token = _token;
  if not found then
    select * into inv from public.invitations
    where group_token = _token and caller_email is not null and lower(coalesce(email, '')) = caller_email
    order by (status = 'PENDING') desc, created_at desc
    limit 1;
    if not found then
      -- Not on the batch (or not signed in): describe the batch.
      select * into inv from public.invitations
      where group_token = _token
      order by (status = 'PENDING' and expires_at > now()) desc, created_at desc
      limit 1;
      if not found then
        return query select 'not_found'::text, null::text, null::text, null::text, null::text, null::text, null::boolean, null::boolean;
        return;
      end if;
      is_group := true;
      select string_agg(left(split_part(i.email, '@', 1), 1) || '***@' || split_part(i.email, '@', 2), ', ' order by i.email)
        into hints
      from public.invitations i
      where i.group_token = _token and coalesce(i.email, '') <> '';
    end if;
  end if;
  return query
  select
    case when inv.status <> 'PENDING' then 'used'
         when inv.expires_at <= now() then 'expired'
         else 'valid' end,
    (select a.name from public.accounts a where a.id = inv.account_id),
    (select p.name from public.properties p where p.id = inv.property_id),
    upper(inv.role),
    (select m.name from public.members m where m.id = inv.created_by_member_id),
    case when is_group then hints
         when coalesce(inv.email, '') = '' then null
         else left(split_part(inv.email, '@', 1), 1) || '***@' || split_part(inv.email, '@', 2) end,
    case when caller_email is null then null
         when is_group then false
         else coalesce(inv.email, '') = '' or lower(inv.email) = caller_email end,
    (select a.type = 'INSTITUTIONAL' from public.accounts a where a.id = inv.account_id);
end;
$$;
grant execute on function public.invitation_preview(text) to anon, authenticated;

drop function if exists public.public_guest_link(text);
create or replace function public.public_guest_link(_token text)
returns table(id uuid, property_id uuid, property_name text, property_address text, valid_from date, valid_to date,
              is_institution boolean)
language sql stable security definer set search_path = public as $$
  select gl.id, gl.property_id, p.name, p.address, gl.valid_from, gl.valid_to, a.type = 'INSTITUTIONAL'
  from public.guest_links gl
  join public.properties p on p.id = gl.property_id
  join public.accounts a on a.id = p.account_id
  where gl.token = _token and gl.revoked_at is null and (gl.expires_at is null or gl.expires_at > now())
  limit 1
$$;
grant execute on function public.public_guest_link(text) to anon, authenticated;

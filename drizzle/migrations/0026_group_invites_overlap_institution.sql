-- T-035 (bugs of 17 Oct 2026).
-- 1. Bug 8: "No" to overlapping stays during onboarding was never stored, so My profile kept
--    asking for "max guests before admin approval". properties.overlap_allowed records the
--    answer (null = never answered), set by set_property_overlap().
-- 2. Bugs 10-12: one invitation link for a whole batch of emails. Every row of a batch keeps
--    its own token and gets the same group_token. accept_invitation() and invitation_preview()
--    accept either; a group link only works for an email on that batch, and each person
--    accepts their own row (so the tile can say who joined).
-- 3. Bug 5: an admin with a work email can turn a family account into an institution's.

-- 1. Overlapping stays ----------------------------------------------------------------------
alter table public.properties add column if not exists overlap_allowed boolean;

-- Existing answers: a saved limit means overlaps were allowed.
update public.properties set overlap_allowed = true
where overlap_allowed is null and overlap_max_guests is not null;

create or replace function public.set_property_overlap(
  _property_id uuid,
  _allowed boolean,
  _max_guests int default null
)
returns void language plpgsql security definer set search_path = public as $$
declare acct uuid;
begin
  select account_id into acct from public.properties where id = _property_id;
  if acct is null or not public.has_account_role(acct, 'admin') then
    raise exception 'Admin role required' using errcode = '42501';
  end if;
  if _allowed is null then raise exception 'bad_overlap'; end if;
  if _max_guests is not null and (_max_guests < 1 or _max_guests > 500) then
    raise exception 'bad_overlap';
  end if;
  update public.properties set
    overlap_allowed = _allowed,
    overlap_max_guests = case when _allowed then coalesce(_max_guests, overlap_max_guests) else null end
  where id = _property_id;
end;
$$;
revoke execute on function public.set_property_overlap(uuid, boolean, int) from public, anon;
grant execute on function public.set_property_overlap(uuid, boolean, int) to authenticated;

-- 2. Group invitation links -----------------------------------------------------------------
alter table public.invitations add column if not exists group_token text;
create index if not exists invitations_group_token_idx on public.invitations (group_token)
  where group_token is not null;

-- A group token belongs to one account and is never anyone's single token (and the other way
-- round). Without this, an admin of another account who had seen a group link could insert a
-- row whose token or group_token equals it and catch the people opening that link (PR #46
-- review). The browser picks the tokens, so the database checks them; definer so the check
-- sees rows of every account, which row-level security would hide.
create or replace function public.invitations_token_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.group_token is not null then
    perform pg_advisory_xact_lock(hashtext('invitation_group:' || new.group_token));
    if exists (select 1 from public.invitations
               where group_token = new.group_token and account_id <> new.account_id)
       or exists (select 1 from public.invitations where token = new.group_token) then
      raise exception 'invitation_token_taken' using errcode = '23505';
    end if;
  end if;
  if exists (select 1 from public.invitations where group_token = new.token) then
    raise exception 'invitation_token_taken' using errcode = '23505';
  end if;
  return new;
end;
$$;
revoke execute on function public.invitations_token_guard() from public, anon, authenticated;
drop trigger if exists invitations_token_guard on public.invitations;
create trigger invitations_token_guard
  before insert or update of token, group_token, account_id on public.invitations
  for each row execute function public.invitations_token_guard();

create or replace function public.accept_invitation(_token text)
returns uuid language plpgsql security definer set search_path = public as $$
declare inv public.invitations; new_member uuid; inviter_branch text; caller_email text; display text;
begin
  if auth.uid() is null then
    raise exception 'invitation_sign_in_required' using errcode = '42501';
  end if;
  caller_email := lower(coalesce(auth.jwt()->>'email', ''));

  select * into inv from public.invitations where token = _token for update;
  if not found then
    -- A group link: use this person's own row of the batch (a pending one first).
    select * into inv from public.invitations
    where group_token = _token and lower(coalesce(email, '')) = caller_email
    order by (status = 'PENDING') desc, created_at desc
    limit 1
    for update;
    if not found then
      if exists (select 1 from public.invitations where group_token = _token) then
        raise exception 'invitation_email_mismatch' using errcode = '42501';
      end if;
      raise exception 'invitation_not_found' using errcode = '22023';
    end if;
  end if;
  if inv.status <> 'PENDING' then
    -- Opening your own accepted link again is fine: just go to that account.
    if inv.accepted_by = auth.uid() then
      select id into new_member from public.members
      where account_id = inv.account_id and user_id = auth.uid();
      if new_member is not null then
        update public.profiles set active_account_id = inv.account_id where user_id = auth.uid();
        return new_member;
      end if;
    end if;
    raise exception 'invitation_used' using errcode = '22023';
  end if;
  if inv.expires_at <= now() then
    raise exception 'invitation_expired' using errcode = '22023';
  end if;

  if coalesce(inv.email, '') <> '' and lower(inv.email) <> caller_email then
    raise exception 'invitation_email_mismatch' using errcode = '42501';
  end if;

  select id into new_member from public.members
  where account_id = inv.account_id and user_id = auth.uid();

  if new_member is null then
    select branch into inviter_branch from public.members where id = inv.created_by_member_id;
    select coalesce(nullif(display_name, ''), nullif(split_part(caller_email, '@', 1), ''), 'Member')
      into display from public.profiles where user_id = auth.uid();
    insert into public.members (account_id, name, email, role, branch, user_id)
    values (inv.account_id,
            coalesce(display, nullif(split_part(caller_email, '@', 1), ''), 'Member'),
            caller_email,
            case when upper(inv.role) in ('ADMIN', 'OWNER') then 'ADMIN' else 'MEMBER' end,
            coalesce(inviter_branch, 'General'),
            auth.uid())
    returning id into new_member;
  elsif upper(inv.role) in ('ADMIN', 'OWNER') then
    -- Already a member there: an admin invitation promotes, a member invitation never demotes.
    update public.members set role = 'ADMIN'
    where id = new_member and role not in ('ADMIN', 'OWNER');
  end if;

  insert into public.profiles (user_id, member_id, onboarding_completed_at, active_account_id)
  values (auth.uid(), new_member, now(), inv.account_id)
  on conflict (user_id) do update
    set member_id = coalesce(public.profiles.member_id, excluded.member_id),
        onboarding_completed_at = coalesce(public.profiles.onboarding_completed_at, now()),
        active_account_id = excluded.active_account_id;

  if inv.property_id is not null and upper(inv.role) in ('ADMIN', 'OWNER') then
    insert into public.property_admins (property_id, member_id) values (inv.property_id, new_member)
    on conflict do nothing;
  end if;

  update public.invitations set status = 'ACCEPTED', accepted_by = auth.uid() where id = inv.id;
  return new_member;
end;
$$;
revoke execute on function public.accept_invitation(text) from public, anon;
grant execute on function public.accept_invitation(text) to authenticated;

-- Same columns as before (migration 0020). For a group link: the signed-in person's own row
-- when they are on the batch; otherwise the batch as a whole, with every email masked.
create or replace function public.invitation_preview(_token text)
returns table (
  state text,
  account_name text,
  property_name text,
  role text,
  invited_by text,
  email_hint text,
  email_matches boolean
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
        return query select 'not_found'::text, null::text, null::text, null::text, null::text, null::text, null::boolean;
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
         else coalesce(inv.email, '') = '' or lower(inv.email) = caller_email end;
end;
$$;
grant execute on function public.invitation_preview(text) to anon, authenticated;

-- 3. Family account -> institution ----------------------------------------------------------
create or replace function public.convert_account_to_institution(_account_id uuid, _name text)
returns void language plpgsql security definer set search_path = public as $$
declare caller_email text; domain text;
begin
  if not public.has_account_role(_account_id, 'admin') then
    raise exception 'Admin role required' using errcode = '42501';
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
end;
$$;
revoke execute on function public.convert_account_to_institution(uuid, text) from public, anon;
grant execute on function public.convert_account_to_institution(uuid, text) to authenticated;

-- 0011 Multi-account tenancy (ADR-0002)
-- `members` becomes the membership table: one row per (account, user), so a person can
-- belong to several accounts (their family chata, the in-laws' chata, an institution).
-- The active account lives on the profile; roles are read from members.role per account.
-- `user_roles` is kept for history but no longer grants anything.

-- Columns used by the functions below (share links are explained in 0012).
alter table public.properties
  add column if not exists public_token text not null default encode(gen_random_bytes(16), 'hex'),
  add column if not exists public_calendar_enabled boolean not null default false;
create unique index if not exists properties_public_token_key on public.properties (public_token);

alter table public.members drop constraint if exists members_user_id_key;
create unique index if not exists members_account_user_unique
  on public.members (account_id, user_id) where user_id is not null;
create index if not exists members_user_id_idx on public.members (user_id);

alter table public.profiles
  add column if not exists active_account_id uuid references public.accounts(id) on delete set null;

update public.profiles p
set active_account_id = m.account_id
from public.members m
where m.user_id = p.user_id and p.active_account_id is null;

-- Membership helpers ---------------------------------------------------------

create or replace function public.is_member(_account_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members where account_id = _account_id and user_id = auth.uid())
$$;

create or replace function public.has_account_role(_account_id uuid, _role text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.members
    where account_id = _account_id and user_id = auth.uid()
      and case _role
            when 'owner' then role = 'OWNER'
            when 'admin' then role in ('ADMIN', 'OWNER')
            else true
          end
  )
$$;

-- Active account: the one saved on the profile if the user still belongs to it,
-- otherwise the oldest membership.
create or replace function public.current_account_id()
returns uuid language sql stable security definer set search_path = public as $$
  select coalesce(
    (select p.active_account_id from public.profiles p
       where p.user_id = auth.uid()
         and exists (select 1 from public.members m
                     where m.account_id = p.active_account_id and m.user_id = auth.uid())),
    (select m.account_id from public.members m
       where m.user_id = auth.uid() order by m.created_at limit 1)
  )
$$;

create or replace function public.current_member_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.members
  where user_id = auth.uid() and account_id = public.current_account_id()
  limit 1
$$;

-- has_role keeps its signature so every existing policy keeps working, but it now
-- means "has this role in the ACTIVE account" instead of a global flag.
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select _user_id = auth.uid() and exists (
    select 1 from public.members m
    where m.user_id = auth.uid()
      and m.account_id = public.current_account_id()
      and (_role = 'member' or m.role in ('ADMIN', 'OWNER'))
  )
$$;

create or replace function public.set_active_account(_account_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
begin
  if not public.is_member(_account_id) then
    raise exception 'not_a_member' using errcode = '42501';
  end if;
  insert into public.profiles (user_id, active_account_id) values (auth.uid(), _account_id)
  on conflict (user_id) do update set active_account_id = excluded.active_account_id;
  return _account_id;
end;
$$;

-- Accounts: a user can see every account they belong to (for the switcher).
drop policy if exists "Members read own account" on public.accounts;
create policy "Members read their accounts" on public.accounts
  for select to authenticated using (public.is_member(id));

drop policy if exists "Members read account members" on public.members;
create policy "Members read members of their accounts" on public.members
  for select to authenticated using (public.is_member(account_id));

-- A member may edit their own name, phone and branch, but never their role or account.
revoke update on public.members from authenticated;
grant update (name, phone, branch) on public.members to authenticated;

-- Onboarding and invitation functions ----------------------------------------

create or replace function public.claim_initial_membership()
returns uuid language plpgsql security definer set search_path = public as $$
declare claimed_member uuid; caller_email text;
begin
  select id into claimed_member from public.members
  where user_id = auth.uid() order by created_at limit 1;
  if claimed_member is not null then return claimed_member; end if;

  -- Link an unclaimed member row that an admin created with this person's email.
  -- Relies on Supabase "Confirm email" being on, so the email is proven.
  caller_email := lower(coalesce(auth.jwt()->>'email', ''));
  if caller_email = '' then return null; end if;
  update public.members set user_id = auth.uid()
  where id = (
    select id from public.members
    where user_id is null and lower(email) = caller_email
    order by created_at limit 1
  )
  returning id into claimed_member;
  if claimed_member is null then return null; end if;

  insert into public.profiles (user_id, member_id, active_account_id)
  select auth.uid(), claimed_member, account_id from public.members where id = claimed_member
  on conflict (user_id) do update
    set member_id = coalesce(public.profiles.member_id, excluded.member_id),
        active_account_id = coalesce(public.profiles.active_account_id, excluded.active_account_id);
  return claimed_member;
end;
$$;

create or replace function public.accept_invitation(_token text)
returns uuid language plpgsql security definer set search_path = public as $$
declare inv public.invitations; new_member uuid; inviter_branch text; caller_email text; display text;
begin
  select * into inv from public.invitations
  where token = _token and status = 'PENDING' and expires_at > now()
  for update;
  if not found then return null; end if;

  caller_email := lower(coalesce(auth.jwt()->>'email', ''));
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
            case when inv.role in ('ADMIN', 'OWNER') then 'ADMIN' else 'MEMBER' end,
            coalesce(inviter_branch, 'General'),
            auth.uid())
    returning id into new_member;
  end if;

  insert into public.profiles (user_id, member_id, onboarding_completed_at, active_account_id)
  values (auth.uid(), new_member, now(), inv.account_id)
  on conflict (user_id) do update
    set member_id = coalesce(public.profiles.member_id, excluded.member_id),
        onboarding_completed_at = coalesce(public.profiles.onboarding_completed_at, now()),
        active_account_id = excluded.active_account_id;

  -- Only an ADMIN invitation makes someone admin of the invited chata.
  if inv.property_id is not null and inv.role in ('ADMIN', 'OWNER') then
    insert into public.property_admins (property_id, member_id) values (inv.property_id, new_member)
    on conflict do nothing;
  end if;

  update public.invitations set status = 'ACCEPTED', accepted_by = auth.uid() where id = inv.id;
  return new_member;
end;
$$;

create or replace function public.create_account_onboarding(
  _type text,
  _account_name text,
  _property_name text,
  _address text default '',
  _city text default null,
  _rooms int default null,
  _seasons text[] default '{}',
  _overlap_max_guests int default null,
  _house_rules text default ''
)
returns uuid language plpgsql security definer set search_path = public as $$
declare new_account uuid; new_property uuid; new_member uuid; caller_email text; display text;
begin
  if auth.uid() is null then raise exception 'not_signed_in' using errcode = '42501'; end if;
  if _type not in ('FAMILY', 'INSTITUTIONAL') then raise exception 'bad_type'; end if;
  caller_email := coalesce(auth.jwt()->>'email', '');
  select nullif(display_name, '') into display from public.profiles where user_id = auth.uid();

  insert into public.accounts (type, name) values (_type, _account_name) returning id into new_account;
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

create or replace function public.add_property(
  _name text,
  _address text default '',
  _city text default null,
  _rooms int default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare new_property uuid; caller_member uuid; acct uuid;
begin
  acct := public.current_account_id();
  if acct is null or not public.has_account_role(acct, 'admin') then
    raise exception 'Admin role required' using errcode = '42501';
  end if;
  caller_member := public.current_member_id();
  insert into public.properties (account_id, name, address, city, rooms, auto_confirm, handover_items,
                                 created_by_member_id, public_calendar_enabled)
  values (acct, _name, _address, _city, _rooms, true, '[]'::jsonb, caller_member,
          (select type = 'INSTITUTIONAL' from public.accounts where id = acct))
  returning id into new_property;
  insert into public.property_admins (property_id, member_id) values (new_property, caller_member)
  on conflict do nothing;
  return new_property;
end;
$$;

-- Admin rights: one server-side function, one role store (members.role), per account.
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

-- Nobody writes user_roles from the browser any more.
revoke insert, update, delete on public.user_roles from authenticated;

grant execute on function public.is_member(uuid) to authenticated;
grant execute on function public.has_account_role(uuid, text) to authenticated;
grant execute on function public.current_member_id() to authenticated;
grant execute on function public.set_active_account(uuid) to authenticated;
grant execute on function public.set_member_role(uuid, text) to authenticated;
revoke execute on function public.set_active_account(uuid) from public, anon;
revoke execute on function public.set_member_role(uuid, text) from public, anon;
revoke execute on function public.create_account_onboarding(text, text, text, text, text, int, text[], int, text) from public, anon;
revoke execute on function public.add_property(text, text, text, int) from public, anon;
revoke execute on function public.accept_invitation(text) from public, anon;
revoke execute on function public.claim_initial_membership() from public, anon;
grant execute on function public.create_account_onboarding(text, text, text, text, text, int, text[], int, text) to authenticated;
grant execute on function public.add_property(text, text, text, int) to authenticated;
grant execute on function public.accept_invitation(text) to authenticated;
grant execute on function public.claim_initial_membership() to authenticated;

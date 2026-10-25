-- 0036 Owner role, account type changes, admin-only institution requests (T-045, ADR-0013)
--
-- 1. D-22: every account gets an explicit OWNER (the founding admin). OWNER counts as admin
--    everywhere (has_account_role 'admin' already includes it). Exactly one per account; it
--    moves only with transfer_account_ownership(). New accounts: the first member row with a
--    sign-in becomes OWNER.
-- 2. D-03: change_account_type(): family <-> organisation, owner only, at most once in six
--    months (accounts.type_changed_at), and refused while a paid subscription runs (billing
--    will handle that case, ADR-0013). convert_account_to_institution() now goes through it.
-- 3. D-16: institution stay requests (from the public institution form) are read and decided
--    by admins only. Members' own bookings follow the account's auto-approval answer (0032).

-- 1. Owner ---------------------------------------------------------------------------------

-- An OWNER row nobody signed in to (none expected; seed data was removed in 0019) can't act as
-- owner: make it an admin so a member with a sign-in can take the role.
update public.members set role = 'ADMIN' where role = 'OWNER' and user_id is null;
--> statement-breakpoint

-- Backfill: the oldest admin with a sign-in becomes the owner, where no owner exists yet.
update public.members m set role = 'OWNER'
from (
  select distinct on (account_id) id
  from public.members
  where user_id is not null and role in ('ADMIN', 'OWNER')
  order by account_id, (role = 'OWNER') desc, created_at, id
) f
where m.id = f.id
  and m.role = 'ADMIN'
  and not exists (
    select 1 from public.members o where o.account_id = m.account_id and o.role = 'OWNER'
  );
--> statement-breakpoint

create unique index if not exists members_one_owner_per_account
  on public.members (account_id) where role = 'OWNER';
--> statement-breakpoint

-- The account's owner. Internal: called only by the definer functions below.
create or replace function public.account_founder(_account_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select user_id from public.members
  where account_id = _account_id and role = 'OWNER'
  limit 1
$$;
--> statement-breakpoint
revoke execute on function public.account_founder(uuid) from public, anon, authenticated;
--> statement-breakpoint

-- An account without an owner gets one: the first admin row with a sign-in that is inserted or
-- updated (a new account's founder; an admin promoted or claiming their row in an account whose
-- owner is gone). Invitations never create an OWNER (accept_invitation maps it to ADMIN); a
-- second OWNER row becomes ADMIN, and the index refuses one by any other route.
create or replace function public.members_first_is_owner()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.role = 'OWNER' and (new.user_id is null or exists (
       select 1 from public.members
       where account_id = new.account_id and role = 'OWNER' and id is distinct from new.id)) then
    new.role := 'ADMIN';
  elsif new.role = 'ADMIN' and new.user_id is not null and not exists (
       select 1 from public.members where account_id = new.account_id and role = 'OWNER') then
    new.role := 'OWNER';
  end if;
  return new;
end;
$$;
--> statement-breakpoint
drop trigger if exists members_first_is_owner on public.members;
--> statement-breakpoint
create trigger members_first_is_owner before insert or update of role, user_id on public.members
  for each row execute function public.members_first_is_owner();
--> statement-breakpoint

-- Hand the account to another admin who has a sign-in. The old owner stays an admin.
create or replace function public.transfer_account_ownership(_account_id uuid, _to_member_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare target public.members; me uuid;
begin
  if not public.has_account_role(_account_id, 'owner') then
    raise exception 'owner_required' using errcode = '42501';
  end if;
  select * into target from public.members where id = _to_member_id for update;
  if not found or target.account_id <> _account_id then
    raise exception 'member_not_in_account' using errcode = '22023';
  end if;
  if target.role = 'OWNER' then return; end if;
  if target.user_id is null then raise exception 'member_has_no_sign_in'; end if;
  if target.role <> 'ADMIN' then raise exception 'new_owner_must_be_admin'; end if;
  select id into me from public.members
  where account_id = _account_id and user_id = auth.uid() and role = 'OWNER' for update;
  update public.members set role = 'ADMIN' where id = me;
  update public.members set role = 'OWNER' where id = target.id;
  insert into public.audit_log (account_id, actor_user_id, action, target_type, target_id, detail)
  values (_account_id, auth.uid(), 'ownership_transferred', 'member', target.id,
          jsonb_build_object('from_member', me));
end;
$$;
--> statement-breakpoint
revoke execute on function public.transfer_account_ownership(uuid, uuid) from public, anon;
--> statement-breakpoint
grant execute on function public.transfer_account_ownership(uuid, uuid) to authenticated;
--> statement-breakpoint

-- 2. Account type changes ------------------------------------------------------------------

alter table public.accounts add column if not exists type_changed_at timestamptz;
--> statement-breakpoint

-- When the owner may change the type again (null = now).
create or replace function public.account_type_change_after(_account_id uuid)
returns timestamptz language sql stable security definer set search_path = public as $$
  select case when public.is_member(_account_id) then a.type_changed_at + interval '6 months' end
  from public.accounts a where a.id = _account_id
$$;
--> statement-breakpoint
revoke execute on function public.account_type_change_after(uuid) from public, anon;
--> statement-breakpoint
grant execute on function public.account_type_change_after(uuid) to authenticated;
--> statement-breakpoint

create or replace function public.change_account_type(_account_id uuid, _to text, _name text default null)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare acc public.accounts; caller_email text; domain text; new_name text;
begin
  if not public.has_account_role(_account_id, 'owner') then
    raise exception 'owner_required' using errcode = '42501';
  end if;
  if _to not in ('FAMILY', 'INSTITUTIONAL') then raise exception 'bad_type'; end if;
  select * into acc from public.accounts where id = _account_id for update;
  if acc.type = _to then raise exception 'same_type'; end if;
  if acc.type_changed_at is not null and acc.type_changed_at + interval '6 months' > now() then
    raise exception 'type_change_cooldown:%', to_char(acc.type_changed_at + interval '6 months', 'YYYY-MM-DD')
      using errcode = '42501';
  end if;
  -- A paid plan is changed through billing (prorating, a new invoice), not here.
  if exists (
    select 1 from public.subscriptions s join public.plans p on p.id = s.plan_id
    where s.account_id = _account_id and s.status in ('trialing', 'active', 'past_due')
      and coalesce(p.price_czk_month, 0) > 0
  ) then
    raise exception 'billing_change_required' using errcode = '42501';
  end if;
  new_name := nullif(trim(coalesce(_name, '')), '');
  if new_name is not null and (length(new_name) < 2 or length(new_name) > 120) then
    raise exception 'bad_name';
  end if;
  if _to = 'INSTITUTIONAL' then
    if new_name is null then raise exception 'bad_name'; end if;
    caller_email := lower(coalesce(auth.jwt()->>'email', ''));
    domain := split_part(caller_email, '@', 2);
    -- Same list as src/lib/signup.ts PUBLIC_EMAIL_DOMAINS.
    if domain = '' or domain in ('gmail.com', 'googlemail.com', 'seznam.cz', 'centrum.cz', 'email.cz',
        'atlas.cz', 'volny.cz', 'post.cz', 'outlook.com', 'hotmail.com', 'live.com', 'yahoo.com',
        'icloud.com', 'me.com', 'proton.me', 'protonmail.com') then
      raise exception 'institution_email_required' using errcode = '42501';
    end if;
  else
    -- A family account has no Requests screen: decide the organisation's open requests first.
    if exists (select 1 from public.institutional_requests r join public.properties p on p.id = r.property_id
               where p.account_id = _account_id and r.status = 'PENDING') then
      raise exception 'pending_requests';
    end if;
    new_name := coalesce(new_name, acc.name);
    if exists (select 1 from public.properties p where p.account_id = _account_id
               and lower(trim(p.name)) = lower(new_name)) then
      raise exception 'account_name_same_as_cottage';
    end if;
  end if;
  update public.accounts
  set type = _to,
      name = coalesce(new_name, name),
      type_changed_at = now(),
      booking_auto_approve = case when _to = 'INSTITUTIONAL' then booking_auto_approve end
  where id = _account_id;
  insert into public.audit_log (account_id, actor_user_id, action, target_type, target_id, detail)
  values (_account_id, auth.uid(), 'account_type_changed', 'account', _account_id,
          jsonb_build_object('from', acc.type, 'to', _to, 'name', coalesce(new_name, acc.name)));
  return now() + interval '6 months';
end;
$$;
--> statement-breakpoint
revoke execute on function public.change_account_type(uuid, text, text) from public, anon;
--> statement-breakpoint
grant execute on function public.change_account_type(uuid, text, text) to authenticated;
--> statement-breakpoint

-- The onboarding/Settings conversion keeps its name and goes through the same rules.
create or replace function public.convert_account_to_institution(_account_id uuid, _name text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_account_role(_account_id, 'admin') then
    raise exception 'Admin role required' using errcode = '42501';
  end if;
  perform public.change_account_type(_account_id, 'INSTITUTIONAL', _name);
end;
$$;
--> statement-breakpoint
revoke execute on function public.convert_account_to_institution(uuid, text) from public, anon;
--> statement-breakpoint
grant execute on function public.convert_account_to_institution(uuid, text) to authenticated;
--> statement-breakpoint

-- 3. Institution requests: admins only ------------------------------------------------------

drop policy if exists "Members manage own requests" on public.institutional_requests;
--> statement-breakpoint
create policy "Admins read requests" on public.institutional_requests for select to authenticated
  using (public.in_current_account(property_id) and public.is_admin());
--> statement-breakpoint
create policy "Admins decide requests" on public.institutional_requests for update to authenticated
  using (public.in_current_account(property_id) and public.is_admin())
  with check (public.in_current_account(property_id) and public.is_admin());
--> statement-breakpoint
create policy "Admins delete requests" on public.institutional_requests for delete to authenticated
  using (public.in_current_account(property_id) and public.is_admin());

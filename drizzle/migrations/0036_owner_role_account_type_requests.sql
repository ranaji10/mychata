-- 0036 Owner role, account type changes, admin-only institution requests (T-045, ADR-0013)
--
-- 1. D-22: every account gets an explicit OWNER (the founding admin). OWNER counts as admin
--    everywhere (has_account_role 'admin' already includes it). Exactly one per account; it
--    moves only when the new owner accepts an offer (offer/respond_account_ownership). Any
--    member except the owner may leave (leave_account). New accounts: the first member row with a
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

-- Ownership moves only when the new owner accepts (25 Oct): the owner offers it to a member
-- with a sign-in, the member sees it in Notifications and Members, accepts or declines. On
-- accept the old owner becomes an admin; only then may they leave (leave_account below).
create table if not exists public.ownership_offers (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  from_member_id uuid not null references public.members (id) on delete cascade,
  to_member_id uuid not null references public.members (id) on delete cascade,
  status text not null default 'PENDING'
    check (status in ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
--> statement-breakpoint
create unique index if not exists ownership_offers_one_pending
  on public.ownership_offers (account_id) where status = 'PENDING';
--> statement-breakpoint
alter table public.ownership_offers enable row level security;
--> statement-breakpoint
revoke all on public.ownership_offers from anon, authenticated;
--> statement-breakpoint
grant select on public.ownership_offers to authenticated;
--> statement-breakpoint
create policy "Admins and the person offered read offers" on public.ownership_offers
  for select to authenticated
  using (public.has_account_role(account_id, 'admin')
         or to_member_id in (select id from public.members where user_id = auth.uid()));
--> statement-breakpoint

create or replace function public.offer_account_ownership(_account_id uuid, _to_member_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare target public.members; me uuid; offer uuid;
begin
  if not public.has_account_role(_account_id, 'owner') then
    raise exception 'owner_required' using errcode = '42501';
  end if;
  select * into target from public.members where id = _to_member_id;
  if not found or target.account_id <> _account_id then
    raise exception 'member_not_in_account' using errcode = '22023';
  end if;
  if target.role = 'OWNER' then raise exception 'already_owner'; end if;
  if target.user_id is null then raise exception 'member_has_no_sign_in'; end if;
  -- Locks the owner's row, so two quick offers run one after the other (review, 25 Oct).
  select id into me from public.members
  where account_id = _account_id and user_id = auth.uid() and role = 'OWNER' for update;
  if me is null then raise exception 'owner_required' using errcode = '42501'; end if;
  -- One open offer per account: a new one replaces the old.
  update public.ownership_offers set status = 'CANCELLED', decided_at = now()
  where account_id = _account_id and status = 'PENDING';
  insert into public.ownership_offers (account_id, from_member_id, to_member_id)
  values (_account_id, me, target.id) returning id into offer;
  insert into public.audit_log (account_id, actor_user_id, action, target_type, target_id, detail)
  values (_account_id, auth.uid(), 'ownership_offered', 'member', target.id,
          jsonb_build_object('offer', offer));
  return offer;
end;
$$;
--> statement-breakpoint
revoke execute on function public.offer_account_ownership(uuid, uuid) from public, anon;
--> statement-breakpoint
grant execute on function public.offer_account_ownership(uuid, uuid) to authenticated;
--> statement-breakpoint

create or replace function public.respond_account_ownership(_offer_id uuid, _accept boolean)
returns void language plpgsql security definer set search_path = public as $$
declare o public.ownership_offers; target public.members; old_owner public.members;
begin
  select * into o from public.ownership_offers where id = _offer_id for update;
  if not found then raise exception 'offer_not_found' using errcode = '22023'; end if;
  select * into target from public.members where id = o.to_member_id for update;
  if target.user_id is distinct from auth.uid() then
    raise exception 'not_your_offer' using errcode = '42501';
  end if;
  if o.status <> 'PENDING' then raise exception 'offer_closed'; end if;
  select * into old_owner from public.members where id = o.from_member_id for update;
  if not found or old_owner.role <> 'OWNER' then
    update public.ownership_offers set status = 'CANCELLED', decided_at = now() where id = o.id;
    raise exception 'offer_closed';
  end if;
  _accept := coalesce(_accept, false);
  if _accept then
    update public.members set role = 'ADMIN' where id = old_owner.id;
    update public.members set role = 'OWNER' where id = target.id;
  end if;
  update public.ownership_offers
  set status = case when _accept then 'ACCEPTED' else 'DECLINED' end, decided_at = now()
  where id = o.id;
  insert into public.audit_log (account_id, actor_user_id, action, target_type, target_id, detail)
  values (o.account_id, auth.uid(),
          case when _accept then 'ownership_accepted' else 'ownership_declined' end,
          'member', target.id, jsonb_build_object('offer', o.id, 'from_member', old_owner.id));
end;
$$;
--> statement-breakpoint
revoke execute on function public.respond_account_ownership(uuid, boolean) from public, anon;
--> statement-breakpoint
grant execute on function public.respond_account_ownership(uuid, boolean) to authenticated;
--> statement-breakpoint

create or replace function public.cancel_account_ownership(_offer_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare o public.ownership_offers;
begin
  select * into o from public.ownership_offers where id = _offer_id for update;
  if not found or not public.has_account_role(o.account_id, 'owner') then
    raise exception 'owner_required' using errcode = '42501';
  end if;
  update public.ownership_offers set status = 'CANCELLED', decided_at = now()
  where id = o.id and status = 'PENDING';
end;
$$;
--> statement-breakpoint
revoke execute on function public.cancel_account_ownership(uuid) from public, anon;
--> statement-breakpoint
grant execute on function public.cancel_account_ownership(uuid) to authenticated;
--> statement-breakpoint

-- Offers waiting for the caller, in any of their accounts (Notifications, Members).
create or replace function public.my_ownership_offers()
returns table (id uuid, account_id uuid, account_name text, from_name text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select o.id, o.account_id, a.name, f.name, o.created_at
  from public.ownership_offers o
  join public.members t on t.id = o.to_member_id
  join public.members f on f.id = o.from_member_id
  join public.accounts a on a.id = o.account_id
  where o.status = 'PENDING' and t.user_id = auth.uid()
  order by o.created_at
$$;
--> statement-breakpoint
revoke execute on function public.my_ownership_offers() from public, anon;
--> statement-breakpoint
grant execute on function public.my_ownership_offers() to authenticated;
--> statement-breakpoint

alter table public.members add column if not exists left_at timestamptz;
--> statement-breakpoint

-- Leaving an account (25 Oct). The owner hands the account over first. Open debts are settled
-- first, so nobody leaves owing or being owed. The row stays for history (stays, expenses keep
-- the name) but loses the sign-in, the e-mail (so it can't be re-claimed by e-mail match), admin
-- rights and cottage admin rows. Returns the account the person lands in next, or null.
create or replace function public.leave_account(_account_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare me public.members; next_account uuid; next_member uuid;
begin
  select * into me from public.members
  where account_id = _account_id and user_id = auth.uid() for update;
  if not found then raise exception 'not_a_member' using errcode = '42501'; end if;
  if me.role = 'OWNER' then raise exception 'owner_must_transfer' using errcode = '42501'; end if;
  if exists (
    select 1 from public.expense_splits s
    join public.expenses e on e.id = s.expense_id
    join public.properties p on p.id = e.property_id
    where p.account_id = _account_id and not s.paid_back
      and e.paid_by_member_id is distinct from s.member_id
      and (s.member_id = me.id or e.paid_by_member_id = me.id)
  ) then
    raise exception 'open_debts';
  end if;
  update public.ownership_offers set status = 'CANCELLED', decided_at = now()
  where status = 'PENDING' and to_member_id = me.id;
  delete from public.property_admins where member_id = me.id;
  -- Their open maintenance tasks go back to "nobody" so someone else picks them up. Stays they
  -- booked stay in the calendar under their name (an admin decides about them).
  update public.tasks t set assignee_member_id = null
  from public.properties p
  where p.id = t.property_id and p.account_id = _account_id
    and t.assignee_member_id = me.id and t.status <> 'DONE';
  update public.members set role = 'MEMBER', user_id = null, email = '', left_at = now()
  where id = me.id;
  select m.account_id, m.id into next_account, next_member from public.members m
  where m.user_id = auth.uid() order by m.created_at limit 1;
  update public.profiles
  set active_account_id = case when active_account_id = _account_id then next_account
                               else active_account_id end,
      member_id = case when member_id = me.id then next_member else member_id end
  where user_id = auth.uid();
  insert into public.audit_log (account_id, actor_user_id, action, target_type, target_id, detail)
  values (_account_id, auth.uid(), 'member_left', 'member', me.id, '{}'::jsonb);
  return next_account;
end;
$$;
--> statement-breakpoint
revoke execute on function public.leave_account(uuid) from public, anon;
--> statement-breakpoint
grant execute on function public.leave_account(uuid) to authenticated;
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
--> statement-breakpoint

-- 4. Settling up leaves a trace (25 Oct expense check) ------------------------------------
-- A reported settlement could not be traced: expense_splits keep no time. Same function as 0022
-- plus one audit row per call (who confirmed, between whom, how many shares).
create or replace function public.settle_debt(_property_id uuid, _from uuid, _to uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare acct uuid; me uuid; changed integer;
begin
  select account_id into acct from public.properties where id = _property_id;
  if acct is null or not public.is_member(acct) then
    raise exception 'not_a_member' using errcode = '42501';
  end if;
  select id into me from public.members where account_id = acct and user_id = auth.uid();
  -- The person who receives the money confirms it; an admin may confirm for anyone.
  if me is distinct from _to and not public.has_account_role(acct, 'admin') then
    raise exception 'only_receiver_confirms' using errcode = '42501';
  end if;
  if (select count(*) from public.members where id in (_from, _to) and account_id = acct) <> 2 then
    raise exception 'members_not_in_account' using errcode = '22023';
  end if;

  update public.expense_splits s
  set paid_back = true, paid_back_confirmed_by = me
  from public.expenses e
  where e.id = s.expense_id
    and e.property_id = _property_id
    and not s.paid_back
    and ((s.member_id = _from and e.paid_by_member_id = _to)
      or (s.member_id = _to and e.paid_by_member_id = _from));
  get diagnostics changed = row_count;
  if changed > 0 then
    insert into public.audit_log (account_id, actor_user_id, action, target_type, target_id, detail)
    values (acct, auth.uid(), 'debt_settled', 'property', _property_id,
            jsonb_build_object('from', _from, 'to', _to, 'shares', changed));
  end if;
  return changed;
end;
$$;
--> statement-breakpoint
revoke execute on function public.settle_debt(uuid, uuid, uuid) from public, anon;
--> statement-breakpoint
grant execute on function public.settle_debt(uuid, uuid, uuid) to authenticated;

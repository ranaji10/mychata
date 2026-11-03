-- T-057: e-mails in each person's own language, "I paid" claims the payee confirms, cottage
-- capacity and other cottage facts, house rules private by default, reminders tied to a member.
--
-- 1. profiles.preferred_lang: the language the person last chose in the app (cs/en). The e-mail
--    queue and the sign-in e-mails read it; email_lang() finds it by address (service role only).
-- 2. properties: capacity, beds, check-in/out times, pets allowed. update_property_details() and
--    create_account_onboarding() take them; onboarding's "how many people" is the capacity.
-- 3. House rules from onboarding are members-only (were PUBLIC), stored in Czech and English
--    separately; manual_sections default visibility becomes MEMBERS_ONLY. Existing rows unchanged.
-- 4. payment_claims: a debtor says "I paid X"; X (or an admin) confirms or says it didn't arrive.
--    Confirming marks the shares paid like settle_debt(). Three new notification kinds.
-- 5. remind_debt() puts the reminder's sender in the payload, so the app can drop the reminder
--    once nothing is owed to that person.
-- Nothing is deleted. Safe to run once on the live database.

-- 1. Preferred language ---------------------------------------------------------------------

alter table public.profiles add column if not exists preferred_lang text;
--> statement-breakpoint
alter table public.profiles drop constraint if exists profiles_preferred_lang_check;
--> statement-breakpoint
alter table public.profiles add constraint profiles_preferred_lang_check
  check (preferred_lang is null or preferred_lang in ('cs', 'en'));
--> statement-breakpoint

-- The sign-in e-mail hook knows only the address. Profile first, then the language given at
-- sign-up (user metadata "lang"), else null (the caller falls back to Czech).
create or replace function public.email_lang(_email text)
returns text language plpgsql stable security definer set search_path = public as $$
declare uid uuid; meta text; pref text;
begin
  select u.id, u.raw_user_meta_data->>'lang' into uid, meta
  from auth.users u where lower(u.email) = lower(btrim(coalesce(_email, ''))) limit 1;
  if uid is null then return null; end if;
  select preferred_lang into pref from public.profiles where user_id = uid;
  return coalesce(pref, case when meta in ('cs', 'en') then meta end);
end;
$$;
--> statement-breakpoint
revoke execute on function public.email_lang(text) from public, anon, authenticated;
--> statement-breakpoint
grant execute on function public.email_lang(text) to service_role;
--> statement-breakpoint

-- 2. Cottage facts ------------------------------------------------------------------------------

alter table public.properties
  add column if not exists capacity integer,
  add column if not exists beds integer,
  add column if not exists check_in_time text,
  add column if not exists check_out_time text,
  add column if not exists pets_allowed boolean;
--> statement-breakpoint
alter table public.properties drop constraint if exists properties_capacity_check;
--> statement-breakpoint
alter table public.properties add constraint properties_capacity_check
  check (capacity is null or capacity between 1 and 500);
--> statement-breakpoint
alter table public.properties drop constraint if exists properties_beds_check;
--> statement-breakpoint
alter table public.properties add constraint properties_beds_check
  check (beds is null or beds between 1 and 500);
--> statement-breakpoint
alter table public.properties drop constraint if exists properties_times_check;
--> statement-breakpoint
alter table public.properties add constraint properties_times_check
  check ((check_in_time is null or check_in_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
     and (check_out_time is null or check_out_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'));
--> statement-breakpoint

-- Same as 0022 plus the new facts. Null leaves a value as it is; the old signature goes so that
-- named-argument calls resolve to one function.
drop function if exists public.update_property_details(uuid, text, text, int, text[], int);
--> statement-breakpoint
create or replace function public.update_property_details(
  _property_id uuid,
  _address text default null,
  _city text default null,
  _rooms int default null,
  _seasons text[] default null,
  _overlap_max_guests int default null,
  _capacity int default null,
  _beds int default null,
  _check_in_time text default null,
  _check_out_time text default null,
  _pets_allowed boolean default null
)
returns void language plpgsql security definer set search_path = public as $$
declare acct uuid;
begin
  select account_id into acct from public.properties where id = _property_id;
  if acct is null or not public.has_account_role(acct, 'admin') then
    raise exception 'Admin role required' using errcode = '42501';
  end if;
  if _rooms is not null and (_rooms < 1 or _rooms > 200) then raise exception 'bad_rooms'; end if;
  if _overlap_max_guests is not null and (_overlap_max_guests < 1 or _overlap_max_guests > 500) then
    raise exception 'bad_overlap';
  end if;
  if _capacity is not null and (_capacity < 1 or _capacity > 500) then raise exception 'bad_capacity'; end if;
  if _beds is not null and (_beds < 1 or _beds > 500) then raise exception 'bad_beds'; end if;
  if (nullif(btrim(_check_in_time), '') is not null
      and btrim(_check_in_time) !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
     or (nullif(btrim(_check_out_time), '') is not null
      and btrim(_check_out_time) !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$') then
    raise exception 'bad_time';
  end if;
  update public.properties set
    address = coalesce(nullif(trim(_address), ''), address),
    city = coalesce(nullif(trim(_city), ''), city),
    rooms = coalesce(_rooms, rooms),
    peak_seasons = coalesce(_seasons, peak_seasons),
    overlap_max_guests = coalesce(_overlap_max_guests, overlap_max_guests),
    capacity = coalesce(_capacity, capacity),
    beds = coalesce(_beds, beds),
    check_in_time = coalesce(nullif(btrim(_check_in_time), ''), check_in_time),
    check_out_time = coalesce(nullif(btrim(_check_out_time), ''), check_out_time),
    pets_allowed = coalesce(_pets_allowed, pets_allowed)
  where id = _property_id;
end;
$$;
--> statement-breakpoint
revoke execute on function public.update_property_details(uuid, text, text, int, text[], int, int, int, text, text, boolean) from public, anon;
--> statement-breakpoint
grant execute on function public.update_property_details(uuid, text, text, int, text[], int, int, int, text, text, boolean) to authenticated;
--> statement-breakpoint

-- 3. House rules private by default -------------------------------------------------------------

alter table public.manual_sections alter column visibility set default 'MEMBERS_ONLY';
--> statement-breakpoint

-- Same as 0032 plus _capacity and _house_rules_en; the rules section is MEMBERS_ONLY.
drop function if exists public.create_account_onboarding(text, text, text, text, text, int, text[], int, text, boolean);
--> statement-breakpoint
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
  _booking_auto_approve boolean default null,
  _capacity int default null,
  _house_rules_en text default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare new_account uuid; new_property uuid; new_member uuid; caller_email text; display text;
begin
  if auth.uid() is null then raise exception 'not_signed_in' using errcode = '42501'; end if;
  if _type not in ('FAMILY', 'INSTITUTIONAL') then raise exception 'bad_type'; end if;
  if _type = 'FAMILY' and lower(trim(coalesce(_account_name, ''))) = lower(trim(coalesce(_property_name, ''))) then
    raise exception 'account_name_same_as_cottage';
  end if;
  if _capacity is not null and (_capacity < 1 or _capacity > 500) then raise exception 'bad_capacity'; end if;
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
                                 public_calendar_enabled, capacity)
  values (new_account, _property_name, _address, _city, _rooms, _seasons, _overlap_max_guests,
          _house_rules, true, '[]'::jsonb, new_member, _type = 'INSTITUTIONAL', _capacity)
  returning id into new_property;
  insert into public.property_admins (property_id, member_id) values (new_property, new_member)
  on conflict do nothing;
  insert into public.profiles (user_id, member_id, onboarding_completed_at, active_account_id)
  values (auth.uid(), new_member, now(), new_account)
  on conflict (user_id) do update
    set member_id = coalesce(public.profiles.member_id, excluded.member_id),
        onboarding_completed_at = now(),
        active_account_id = new_account;
  if coalesce(_house_rules, '') <> '' then
    insert into public.manual_sections (property_id, category, title_cs, title_en, content_cs, content_en, visibility, display_order)
    values (new_property, 'rules', 'Pravidla domu', 'House rules', _house_rules,
            coalesce(nullif(btrim(_house_rules_en), ''), _house_rules), 'MEMBERS_ONLY', 0);
  end if;
  return new_property;
end;
$$;
--> statement-breakpoint
revoke execute on function public.create_account_onboarding(text, text, text, text, text, int, text[], int, text, boolean, int, text) from public, anon;
--> statement-breakpoint
grant execute on function public.create_account_onboarding(text, text, text, text, text, int, text[], int, text, boolean, int, text) to authenticated;
--> statement-breakpoint

-- 4. "I paid" claims ------------------------------------------------------------------------------

alter table public.notifications drop constraint if exists notifications_kind_check;
--> statement-breakpoint
alter table public.notifications add constraint notifications_kind_check check (kind in (
  'invitation', 'booking_awaiting_approval', 'booking_decided', 'guest_request_decided',
  'ownership_offered', 'task_mentioned', 'leaving_checklist', 'message_to_admin',
  'debt_reminder', 'payment_claimed', 'payment_confirmed', 'payment_rejected'
));
--> statement-breakpoint

create table if not exists public.payment_claims (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  from_member_id uuid not null references public.members (id) on delete cascade,
  to_member_id uuid not null references public.members (id) on delete cascade,
  -- Null: everything the payer owed this person at this cottage; set: one expense's share.
  expense_id uuid references public.expenses (id) on delete cascade,
  -- The unpaid shares between the two when the payment was reported; confirming marks exactly
  -- these paid, so a share added later stays open (T-057 review).
  split_ids uuid[] not null default '{}',
  amount numeric not null check (amount > 0),
  status text not null default 'PENDING' check (status in ('PENDING', 'CONFIRMED', 'REJECTED')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by_member_id uuid references public.members (id) on delete set null,
  check (from_member_id <> to_member_id)
);
--> statement-breakpoint
create index if not exists payment_claims_property_idx
  on public.payment_claims (property_id, status);
--> statement-breakpoint
-- One open claim per pair and expense (or per pair for "everything").
create unique index if not exists payment_claims_one_open
  on public.payment_claims (from_member_id, to_member_id, coalesce(expense_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where status = 'PENDING';
--> statement-breakpoint
alter table public.payment_claims enable row level security;
--> statement-breakpoint
revoke all on public.payment_claims from anon, authenticated;
--> statement-breakpoint
grant select on public.payment_claims to authenticated;
--> statement-breakpoint
grant all on public.payment_claims to service_role;
--> statement-breakpoint
drop policy if exists "Payer, payee or admin read claims" on public.payment_claims;
--> statement-breakpoint
-- Same visibility as the shares themselves: members of the account see who owes whom.
create policy "Members read payment claims" on public.payment_claims
  for select to authenticated using (public.is_member(account_id));
--> statement-breakpoint

create or replace function public.claim_payment(
  _property_id uuid, _to_member_id uuid, _expense_id uuid default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare prop public.properties; me public.members; owed numeric; claim_id uuid; exp_title text;
  splits uuid[];
begin
  select * into prop from public.properties where id = _property_id;
  if not found then raise exception 'not_a_member' using errcode = '42501'; end if;
  select * into me from public.members
  where account_id = prop.account_id and user_id = auth.uid() and left_at is null;
  if not found then raise exception 'not_a_member' using errcode = '42501'; end if;
  if _to_member_id = me.id or not exists (select 1 from public.members
                 where id = _to_member_id and account_id = prop.account_id and left_at is null) then
    raise exception 'member_not_in_account' using errcode = '22023';
  end if;
  if _expense_id is not null then
    select s.amount_owed, coalesce(nullif(e.description, ''), e.category), array[s.id]
      into owed, exp_title, splits
    from public.expense_splits s join public.expenses e on e.id = s.expense_id
    where e.id = _expense_id and e.property_id = _property_id
      and e.paid_by_member_id = _to_member_id and s.member_id = me.id and not s.paid_back;
    owed := coalesce(owed, 0);
  else
    -- Net between the two at this cottage, as the settlement screen shows it.
    select coalesce(sum(case when s.member_id = me.id then s.amount_owed else -s.amount_owed end), 0),
           coalesce(array_agg(s.id), '{}')
      into owed, splits
    from public.expense_splits s join public.expenses e on e.id = s.expense_id
    where e.property_id = _property_id and not s.paid_back
      and ((s.member_id = me.id and e.paid_by_member_id = _to_member_id)
        or (s.member_id = _to_member_id and e.paid_by_member_id = me.id));
  end if;
  if owed <= 0 then raise exception 'nothing_owed' using errcode = '22023'; end if;

  select id into claim_id from public.payment_claims
  where from_member_id = me.id and to_member_id = _to_member_id and status = 'PENDING'
    and expense_id is not distinct from _expense_id;
  if claim_id is not null then return claim_id; end if;
  if not public.bump_usage('payment_claim', 20) then
    raise exception 'rate_limited' using errcode = '54000';
  end if;

  insert into public.payment_claims (account_id, property_id, from_member_id, to_member_id, expense_id, amount, split_ids)
  values (prop.account_id, _property_id, me.id, _to_member_id, _expense_id, owed, splits)
  returning id into claim_id;
  perform public.notify_enqueue(prop.account_id, 'payment_claimed', _to_member_id, null, null,
    jsonb_build_object('claim_id', claim_id, 'from_name', me.name, 'from_member_id', me.id,
      'amount', owed, 'property_name', prop.name, 'property_id', prop.id,
      'expense_id', _expense_id, 'expense_title', exp_title),
    'payment_claimed:' || claim_id);
  return claim_id;
end;
$$;
--> statement-breakpoint
revoke execute on function public.claim_payment(uuid, uuid, uuid) from public, anon;
--> statement-breakpoint
grant execute on function public.claim_payment(uuid, uuid, uuid) to authenticated;
--> statement-breakpoint

create or replace function public.decide_payment_claim(_claim_id uuid, _received boolean)
returns text language plpgsql security definer set search_path = public as $$
declare c public.payment_claims; me public.members; prop public.properties; payer public.members;
begin
  select * into c from public.payment_claims where id = _claim_id for update;
  if not found then raise exception 'claim_not_found' using errcode = '22023'; end if;
  select * into me from public.members
  where account_id = c.account_id and user_id = auth.uid() and left_at is null;
  if not found then raise exception 'not_a_member' using errcode = '42501'; end if;
  if me.id = c.from_member_id then
    raise exception 'only_receiver_confirms' using errcode = '42501';
  end if;
  if me.id <> c.to_member_id and not public.has_account_role(c.account_id, 'admin') then
    raise exception 'only_receiver_confirms' using errcode = '42501';
  end if;
  if c.status <> 'PENDING' then raise exception 'already_decided' using errcode = '22023'; end if;
  select * into prop from public.properties where id = c.property_id;
  select * into payer from public.members where id = c.from_member_id;

  update public.payment_claims
  set status = case when _received then 'CONFIRMED' else 'REJECTED' end,
      decided_at = now(), decided_by_member_id = me.id
  where id = c.id;

  if _received then
    -- Exactly the shares owed when the payment was reported; a share added later stays open.
    update public.expense_splits s
    set paid_back = true, paid_back_confirmed_by = me.id
    where s.id = any(c.split_ids) and not s.paid_back;
    insert into public.audit_log (account_id, actor_user_id, action, target_type, target_id, detail)
    values (c.account_id, auth.uid(), 'payment_confirmed', 'property', c.property_id,
            jsonb_build_object('claim', c.id, 'from', c.from_member_id, 'to', c.to_member_id));
  end if;

  perform public.notify_enqueue(c.account_id,
    case when _received then 'payment_confirmed' else 'payment_rejected' end,
    c.from_member_id, null, null,
    jsonb_build_object('claim_id', c.id, 'from_name', me.name, 'amount', c.amount,
      'property_name', prop.name, 'property_id', prop.id, 'expense_id', c.expense_id),
    'payment_decided:' || c.id);
  return case when _received then 'CONFIRMED' else 'REJECTED' end;
end;
$$;
--> statement-breakpoint
revoke execute on function public.decide_payment_claim(uuid, boolean) from public, anon;
--> statement-breakpoint
grant execute on function public.decide_payment_claim(uuid, boolean) to authenticated;
--> statement-breakpoint

-- A claim closes by itself when what it was about gets paid another way (Confirm payment
-- received, Cover it all, an admin): no more "waiting to confirm" for money already settled.
create or replace function public.close_settled_claims()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not (new.paid_back and not old.paid_back) then return null; end if;
  -- An open claim closes once every share it covered is paid.
  update public.payment_claims c
  set status = 'CONFIRMED', decided_at = now()
  where c.status = 'PENDING' and new.id = any(c.split_ids)
    and not exists (select 1 from public.expense_splits s
                    where s.id = any(c.split_ids) and not s.paid_back);
  return null;
end;
$$;
--> statement-breakpoint
revoke execute on function public.close_settled_claims() from public, anon, authenticated;
--> statement-breakpoint
drop trigger if exists expense_splits_close_claims on public.expense_splits;
--> statement-breakpoint
create trigger expense_splits_close_claims after update of paid_back on public.expense_splits
  for each row execute function public.close_settled_claims();
--> statement-breakpoint

-- 5. Reminder knows who sent it ----------------------------------------------------------------

create or replace function public.remind_debt(_property_id uuid, _member_id uuid)
returns numeric language plpgsql security definer set search_path = public as $$
declare prop public.properties; me public.members; owed numeric;
begin
  select * into prop from public.properties where id = _property_id;
  if not found then raise exception 'not_a_member' using errcode = '42501'; end if;
  select * into me from public.members
  where account_id = prop.account_id and user_id = auth.uid() and left_at is null;
  if not found then raise exception 'not_a_member' using errcode = '42501'; end if;
  if not exists (select 1 from public.members
                 where id = _member_id and account_id = prop.account_id and left_at is null) then
    raise exception 'member_not_in_account' using errcode = '22023';
  end if;
  select coalesce(sum(s.amount_owed), 0) into owed
  from public.expense_splits s join public.expenses e on e.id = s.expense_id
  where e.property_id = _property_id and e.paid_by_member_id = me.id
    and s.member_id = _member_id and not s.paid_back;
  if owed <= 0 then raise exception 'nothing_owed' using errcode = '22023'; end if;
  if not public.bump_usage('debt_reminder', 10) then
    raise exception 'rate_limited' using errcode = '54000';
  end if;
  perform public.notify_enqueue(prop.account_id, 'debt_reminder', _member_id, null, null,
    jsonb_build_object('from_name', me.name, 'from_member_id', me.id, 'amount', owed,
      'property_name', prop.name, 'property_id', prop.id),
    'debt_reminder:' || me.id || ':' || _member_id || ':' || current_date);
  return owed;
end;
$$;
--> statement-breakpoint
revoke execute on function public.remind_debt(uuid, uuid) from public, anon;
--> statement-breakpoint
grant execute on function public.remind_debt(uuid, uuid) to authenticated;

-- 0015 Operational guardrails and the billing skeleton (defect 11; ADR-0005)
-- Rate limits for AI calls, server-checked feature switches, an audit log for admin
-- decisions, and the tables subscriptions will need. Nothing here charges anyone yet.

-- Usage counters and daily limits ---------------------------------------------------
create table if not exists public.usage_counters (
  user_id uuid not null,
  kind text not null,
  day date not null default current_date,
  count int not null default 0,
  primary key (user_id, kind, day)
);
alter table public.usage_counters enable row level security;
grant select on public.usage_counters to authenticated;
grant all on public.usage_counters to service_role;
create policy "Users read own usage" on public.usage_counters for select to authenticated
  using (user_id = auth.uid());

-- Returns true and counts the call when under the limit; false when the limit is reached.
create or replace function public.bump_usage(_kind text, _daily_limit int)
returns boolean language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if auth.uid() is null then return false; end if;
  insert into public.usage_counters (user_id, kind, day, count) values (auth.uid(), _kind, current_date, 1)
  on conflict (user_id, kind, day) do update set count = public.usage_counters.count + 1
  returning count into n;
  return n <= _daily_limit;
end;
$$;
revoke execute on function public.bump_usage(text, int) from public, anon;
grant execute on function public.bump_usage(text, int) to authenticated;

-- Feature switches (kill switches) ----------------------------------------------------
create table if not exists public.feature_flags (
  key text primary key,
  enabled boolean not null default true,
  note text,
  updated_at timestamptz not null default now()
);
alter table public.feature_flags enable row level security;
grant select on public.feature_flags to anon, authenticated;
grant all on public.feature_flags to service_role;
create policy "Anyone reads flags" on public.feature_flags for select to anon, authenticated using (true);
insert into public.feature_flags (key, note) values
  ('ai_manual', 'House manual answers through the AI gateway'),
  ('ai_translate', 'Task translation through the AI gateway'),
  ('guest_requests', 'Public guest booking requests'),
  ('institutional_requests', 'Public institutional stay requests')
on conflict (key) do nothing;

create or replace function public.feature_enabled(_key text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select enabled from public.feature_flags where key = _key), false)
$$;
grant execute on function public.feature_enabled(text) to anon, authenticated;

-- Public forms respect their switch.
create or replace function public.guard_public_form()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'guest_requests' and not public.feature_enabled('guest_requests') then
    raise exception 'feature_disabled';
  end if;
  if tg_table_name = 'institutional_requests' and auth.uid() is null
     and not public.feature_enabled('institutional_requests') then
    raise exception 'feature_disabled';
  end if;
  return new;
end;
$$;
drop trigger if exists guest_requests_guard on public.guest_requests;
create trigger guest_requests_guard before insert on public.guest_requests
  for each row execute function public.guard_public_form();
drop trigger if exists institutional_requests_guard on public.institutional_requests;
create trigger institutional_requests_guard before insert on public.institutional_requests
  for each row execute function public.guard_public_form();

-- Audit log -----------------------------------------------------------------------
create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  account_id uuid references public.accounts(id) on delete cascade,
  actor_user_id uuid,
  action text not null,
  target_type text,
  target_id uuid,
  detail jsonb not null default '{}',
  at timestamptz not null default now()
);
create index if not exists audit_log_account_at on public.audit_log (account_id, at desc);
alter table public.audit_log enable row level security;
grant select on public.audit_log to authenticated;
grant all on public.audit_log to service_role;
create policy "Admins read audit log" on public.audit_log for select to authenticated
  using (public.has_account_role(account_id, 'admin'));

create or replace function public.audit_decisions()
returns trigger language plpgsql security definer set search_path = public as $$
declare acct uuid;
begin
  if tg_table_name = 'members' then
    if new.role is distinct from old.role then
      insert into public.audit_log (account_id, actor_user_id, action, target_type, target_id, detail)
      values (new.account_id, auth.uid(), 'member_role_changed', 'member', new.id,
              jsonb_build_object('from', old.role, 'to', new.role));
    end if;
  elsif new.status is distinct from old.status then
    select account_id into acct from public.properties where id = new.property_id;
    insert into public.audit_log (account_id, actor_user_id, action, target_type, target_id, detail)
    values (acct, auth.uid(), tg_table_name || '_status_changed', tg_table_name, new.id,
            jsonb_build_object('from', old.status, 'to', new.status));
  end if;
  return new;
end;
$$;
drop trigger if exists members_audit on public.members;
create trigger members_audit after update on public.members
  for each row execute function public.audit_decisions();
drop trigger if exists institutional_requests_audit on public.institutional_requests;
create trigger institutional_requests_audit after update on public.institutional_requests
  for each row execute function public.audit_decisions();
drop trigger if exists guest_requests_audit on public.guest_requests;
create trigger guest_requests_audit after update on public.guest_requests
  for each row execute function public.audit_decisions();
drop trigger if exists bookings_audit on public.bookings;
create trigger bookings_audit after update on public.bookings
  for each row execute function public.audit_decisions();

-- Billing skeleton (no provider connected yet) ------------------------------------
create table if not exists public.plans (
  id text primary key,
  name text not null,
  audience text not null check (audience in ('FAMILY', 'INSTITUTIONAL')),
  price_czk_month numeric,
  limits jsonb not null default '{}',
  active boolean not null default true
);
alter table public.plans enable row level security;
grant select on public.plans to anon, authenticated;
grant all on public.plans to service_role;
create policy "Anyone reads plans" on public.plans for select to anon, authenticated using (active);
-- Draft limits, to be confirmed after user interviews (see docs/product/pricing.md).
insert into public.plans (id, name, audience, price_czk_month, limits) values
  ('family_free', 'Family', 'FAMILY', 0, '{"properties": 2, "storage_mb": 500, "ai_questions_per_day": 20}'),
  ('family_plus', 'Family Plus', 'FAMILY', null, '{"properties": 5, "storage_mb": 5000, "ai_questions_per_day": 100, "guest_links": true}'),
  ('institution', 'Institution', 'INSTITUTIONAL', null, '{"properties": 50, "storage_mb": 20000, "ai_questions_per_day": 500, "audit_export": true}')
on conflict (id) do nothing;

create table if not exists public.subscriptions (
  account_id uuid primary key references public.accounts(id) on delete cascade,
  plan_id text not null references public.plans(id),
  status text not null default 'active' check (status in ('trialing', 'active', 'past_due', 'canceled')),
  seats int,
  current_period_end timestamptz,
  billing_email text,
  company_id text,        -- IČO
  vat_id text,            -- DIČ
  provider text,          -- e.g. stripe, invoice
  provider_ref text,
  updated_at timestamptz not null default now()
);
alter table public.subscriptions enable row level security;
grant select on public.subscriptions to authenticated;
grant all on public.subscriptions to service_role;
create policy "Admins read own subscription" on public.subscriptions for select to authenticated
  using (public.has_account_role(account_id, 'admin'));

create table if not exists public.billing_events (
  id bigint generated always as identity primary key,
  provider text not null,
  provider_event_id text not null unique,   -- makes webhook retries harmless
  type text not null,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);
alter table public.billing_events enable row level security;
grant all on public.billing_events to service_role;

create or replace function public.account_plan(_account_id uuid)
returns text language sql stable security definer set search_path = public as $$
  select coalesce(
    (select s.plan_id from public.subscriptions s
      where s.account_id = _account_id and s.status in ('trialing', 'active', 'past_due')),
    (select case when a.type = 'INSTITUTIONAL' then 'institution' else 'family_free' end
       from public.accounts a where a.id = _account_id)
  )
$$;
create or replace function public.plan_limit(_account_id uuid, _key text)
returns jsonb language sql stable security definer set search_path = public as $$
  select p.limits -> _key from public.plans p where p.id = public.account_plan(_account_id)
$$;
revoke execute on function public.account_plan(uuid) from public, anon;
revoke execute on function public.plan_limit(uuid, text) from public, anon;
grant execute on function public.account_plan(uuid) to authenticated;
grant execute on function public.plan_limit(uuid, text) to authenticated;

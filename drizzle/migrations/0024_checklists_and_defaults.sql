-- T-018 (CC-2): data changes the next screens need (prompts doc, 26 Sep review).
-- 1. Checklists: a seasonal checklist is one row in `checklists`, its tasks point to it.
--    add_checklist() creates both in one step and refuses a second copy of the same
--    template in the same season unless the person confirmed it (_force).
-- 2. Booking defaults: a booking made with only dates gets the current member as booker and
--    their name. A plain member's booking is PENDING where the chata doesn't auto-confirm
--    and always in an institution; before, any member could write CONFIRMED directly.
-- 3. "Cover it all": the payer (or an admin) forgives everything still owed on an expense
--    in one step, recorded in the audit log.
-- 4. New tasks default to the person creating them when no assignee is given.

-- 1. Checklists ---------------------------------------------------------------------------

create table if not exists public.checklists (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  template_id text not null,
  season text not null,
  title text not null,
  created_by_member_id uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists checklists_property_template on public.checklists (property_id, template_id, season);
alter table public.checklists enable row level security;
grant select on public.checklists to authenticated;
grant all on public.checklists to service_role;
drop policy if exists "Members read checklists" on public.checklists;
create policy "Members read checklists" on public.checklists for select to authenticated
  using (public.in_current_account(property_id));
drop policy if exists "Admins delete checklists" on public.checklists;
create policy "Admins delete checklists" on public.checklists for delete to authenticated
  using (public.in_current_account(property_id) and public.is_admin());
grant delete on public.checklists to authenticated;

alter table public.tasks
  add column if not exists checklist_id uuid references public.checklists(id) on delete set null;
create index if not exists tasks_checklist on public.tasks (checklist_id);

-- _tasks: [{"title_cs": "...", "title_en": "...", "assignee": "<member id or null>"}]
create or replace function public.add_checklist(
  _property_id uuid,
  _template_id text,
  _title text,
  _lang text,
  _tasks jsonb,
  _force boolean default false
)
returns uuid language plpgsql security definer set search_path = public as $$
declare acct uuid; me public.members; season_key text; new_id uuid; item jsonb; who uuid;
begin
  if not public.in_current_account(_property_id) then
    raise exception 'not_a_member' using errcode = '42501';
  end if;
  select account_id into acct from public.properties where id = _property_id;
  select * into me from public.members where account_id = acct and user_id = auth.uid();
  if _lang not in ('cs', 'en') then raise exception 'bad_lang'; end if;
  if jsonb_typeof(_tasks) <> 'array' or jsonb_array_length(_tasks) = 0
     or jsonb_array_length(_tasks) > 50 then
    raise exception 'bad_tasks' using errcode = '22023';
  end if;
  season_key := _template_id || '-' || extract(year from now())::int;
  if not _force and exists (
    select 1 from public.checklists
    where property_id = _property_id and template_id = _template_id and season = season_key
  ) then
    raise exception 'checklist_exists' using errcode = '22023';
  end if;

  insert into public.checklists (account_id, property_id, template_id, season, title, created_by_member_id)
  values (acct, _property_id, _template_id, season_key, left(_title, 200), me.id)
  returning id into new_id;

  for item in select * from jsonb_array_elements(_tasks) loop
    who := nullif(item->>'assignee', '')::uuid;
    -- Only members of this account can be assigned.
    if who is not null and not exists (select 1 from public.members where id = who and account_id = acct) then
      raise exception 'assignee_not_in_account' using errcode = '22023';
    end if;
    insert into public.tasks (property_id, title, source_language, title_cs, title_en, category, urgency,
                              status, created_by, assignee_member_id, checklist_id)
    values (_property_id,
            left(coalesce(item->>('title_' || _lang), item->>'title_cs', ''), 300),
            _lang,
            left(item->>'title_cs', 300),
            left(item->>'title_en', 300),
            'seasonal', 'LOW', 'OPEN', coalesce(me.name, ''), who, new_id);
  end loop;
  return new_id;
end;
$$;
revoke execute on function public.add_checklist(uuid, text, text, text, jsonb, boolean) from public, anon;
grant execute on function public.add_checklist(uuid, text, text, text, jsonb, boolean) to authenticated;

-- 2. Booking defaults -----------------------------------------------------------------------

alter table public.bookings alter column requester_member_id set default public.current_member_id();

create or replace function public.booking_defaults()
returns trigger language plpgsql security definer set search_path = public as $$
declare acct_type text; auto boolean; me uuid;
begin
  if auth.uid() is null then return new; end if;  -- definer functions and service jobs
  select a.type, p.auto_confirm into acct_type, auto
  from public.properties p join public.accounts a on a.id = p.account_id
  where p.id = new.property_id;
  if coalesce(new.requester_name, '') = '' and new.requester_member_id is not null then
    select name into new.requester_name from public.members where id = new.requester_member_id;
  end if;
  me := public.current_member_id();
  -- A plain member's own booking is confirmed only where the chata auto-confirms family stays.
  -- (Bookings written for someone else, like an approved request, keep what was sent.)
  if new.status = 'CONFIRMED' and new.requester_member_id is not distinct from me
     and me is not null and not public.is_admin()
     and (acct_type = 'INSTITUTIONAL' or not coalesce(auto, true)) then
    new.status := 'PENDING';
  end if;
  return new;
end;
$$;
drop trigger if exists bookings_defaults on public.bookings;
create trigger bookings_defaults before insert on public.bookings
  for each row execute function public.booking_defaults();
revoke execute on function public.booking_defaults() from public, anon, authenticated;

-- 3. Cover it all ---------------------------------------------------------------------------

create or replace function public.cover_expense(_expense_id uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare e public.expenses; acct uuid; me uuid; changed integer;
begin
  select * into e from public.expenses where id = _expense_id;
  if not found then raise exception 'expense_not_found' using errcode = '22023'; end if;
  select account_id into acct from public.properties where id = e.property_id;
  if acct is null or not public.is_member(acct) then
    raise exception 'not_a_member' using errcode = '42501';
  end if;
  select id into me from public.members where account_id = acct and user_id = auth.uid();
  if me is distinct from e.paid_by_member_id and not public.has_account_role(acct, 'admin') then
    raise exception 'only_payer_covers' using errcode = '42501';
  end if;
  update public.expense_splits set paid_back = true, paid_back_confirmed_by = me
  where expense_id = e.id and not paid_back;
  get diagnostics changed = row_count;
  insert into public.audit_log (account_id, actor_user_id, action, target_type, target_id, detail)
  values (acct, auth.uid(), 'expense_covered', 'expense', e.id,
          jsonb_build_object('splits_forgiven', changed, 'amount', e.amount));
  return changed;
end;
$$;
revoke execute on function public.cover_expense(uuid) from public, anon;
grant execute on function public.cover_expense(uuid) to authenticated;

-- 4. New tasks default to their creator -------------------------------------------------------
-- A column default applies only when the insert leaves the column out; choosing
-- "Unassigned" (an explicit null) still leaves the task unassigned.
alter table public.tasks alter column assignee_member_id set default public.current_member_id();

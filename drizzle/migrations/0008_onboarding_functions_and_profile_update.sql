create policy "Users update own profile" on public.profiles for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users insert own profile" on public.profiles for insert to authenticated
  with check (user_id = auth.uid());

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
declare new_account uuid; new_property uuid; new_member uuid; caller_email text;
begin
  if exists (select 1 from public.profiles where user_id = auth.uid() and member_id is not null) then
    raise exception 'Account already exists for this user';
  end if;
  caller_email := coalesce(auth.jwt()->>'email', '');
  insert into public.accounts (type, name) values (_type, _account_name) returning id into new_account;
  insert into public.members (account_id, name, email, role, branch, user_id)
  values (new_account, coalesce(nullif(split_part(caller_email,'@',1),''),'Admin'), caller_email, 'ADMIN', 'General', auth.uid())
  returning id into new_member;
  insert into public.properties (account_id, name, address, city, rooms, peak_seasons, overlap_max_guests, house_rules_text, auto_confirm, handover_items, created_by_member_id)
  values (new_account, _property_name, _address, _city, _rooms, _seasons, _overlap_max_guests, _house_rules, true, '[]'::jsonb, new_member)
  returning id into new_property;
  insert into public.property_admins (property_id, member_id) values (new_property, new_member) on conflict do nothing;
  insert into public.profiles (user_id, member_id, onboarding_completed_at)
  values (auth.uid(), new_member, now())
  on conflict (user_id) do update set member_id = excluded.member_id, onboarding_completed_at = now();
  insert into public.user_roles (user_id, role) values (auth.uid(), 'admin'::public.app_role) on conflict do nothing;
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
declare new_property uuid; caller_member uuid;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Admin role required'; end if;
  select id into caller_member from public.members where user_id = auth.uid() limit 1;
  insert into public.properties (account_id, name, address, city, rooms, auto_confirm, handover_items, created_by_member_id)
  values (public.current_account_id(), _name, _address, _city, _rooms, true, '[]'::jsonb, caller_member)
  returning id into new_property;
  if caller_member is not null then
    insert into public.property_admins (property_id, member_id) values (new_property, caller_member) on conflict do nothing;
  end if;
  return new_property;
end;
$$;
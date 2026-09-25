create extension if not exists vector;

alter table public.profiles
  add column display_name text,
  add column avatar_url text,
  add column phone text,
  add column onboarding_completed_at timestamptz;

alter table public.properties
  add column rooms integer,
  add column city text,
  add column overlap_max_guests integer,
  add column peak_seasons text[] not null default '{}',
  add column created_by_member_id uuid references public.members(id);

create table public.property_admins (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  unique (property_id, member_id)
);
grant select, insert, delete on public.property_admins to authenticated;
grant all on public.property_admins to service_role;
alter table public.property_admins enable row level security;
create policy "Members read own account property admins" on public.property_admins for select to authenticated
  using (exists (select 1 from public.properties p where p.id = property_id and p.account_id = public.current_account_id()));
create policy "Admins manage property admins" on public.property_admins for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin') and exists (select 1 from public.properties p where p.id = property_id and p.account_id = public.current_account_id()));
create policy "Admins remove property admins" on public.property_admins for delete to authenticated
  using (public.has_role(auth.uid(), 'admin') and exists (select 1 from public.properties p where p.id = property_id and p.account_id = public.current_account_id()));

create or replace function public.is_property_admin(_property_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(auth.uid(), 'admin') or exists (
    select 1 from public.property_admins pa
    join public.members m on m.id = pa.member_id
    where pa.property_id = _property_id and m.user_id = auth.uid()
  )
$$;

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  property_id uuid references public.properties(id) on delete set null,
  email text,
  role text not null default 'MEMBER',
  token text not null unique default encode(gen_random_bytes(16), 'hex'),
  status text not null default 'PENDING',
  created_by_member_id uuid references public.members(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_by uuid
);
grant select, insert, update on public.invitations to authenticated;
grant all on public.invitations to service_role;
alter table public.invitations enable row level security;
create policy "Members read own account invitations" on public.invitations for select to authenticated
  using (account_id = public.current_account_id());
create policy "Admins create invitations" on public.invitations for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin') and account_id = public.current_account_id());
create policy "Admins update invitations" on public.invitations for update to authenticated
  using (public.has_role(auth.uid(), 'admin') and account_id = public.current_account_id());

create or replace function public.accept_invitation(_token text)
returns uuid language plpgsql security definer set search_path = public as $$
declare inv public.invitations; new_member uuid; inviter_branch text;
begin
  select * into inv from public.invitations where token = _token and status = 'PENDING' and expires_at > now();
  if not found then return null; end if;
  select branch into inviter_branch from public.members where id = inv.created_by_member_id;
  insert into public.members (account_id, name, email, role, branch, user_id)
  values (inv.account_id, coalesce(nullif(split_part(coalesce(auth.jwt()->>'email',''),'@',1),''),'Member'), coalesce(auth.jwt()->>'email',''), inv.role, coalesce(inviter_branch,'General'), auth.uid())
  on conflict do nothing returning id into new_member;
  if new_member is null then
    select id into new_member from public.members where account_id = inv.account_id and user_id = auth.uid();
  end if;
  if new_member is null then return null; end if;
  insert into public.profiles (user_id, member_id) values (auth.uid(), new_member)
  on conflict (user_id) do update set member_id = excluded.member_id;
  insert into public.user_roles (user_id, role)
  values (auth.uid(), case when inv.role in ('ADMIN','OWNER') then 'admin'::public.app_role else 'member'::public.app_role end)
  on conflict do nothing;
  if inv.property_id is not null then
    insert into public.property_admins (property_id, member_id) values (inv.property_id, new_member) on conflict do nothing;
  end if;
  update public.invitations set status = 'ACCEPTED', accepted_by = auth.uid() where id = inv.id;
  return new_member;
end;
$$;

create table public.guest_links (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(16), 'hex'),
  created_by_member_id uuid references public.members(id),
  valid_from date,
  valid_to date,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.guest_links to authenticated;
grant all on public.guest_links to service_role;
alter table public.guest_links enable row level security;
create policy "Members manage own account guest links" on public.guest_links for all to authenticated
  using (exists (select 1 from public.properties p where p.id = property_id and p.account_id = public.current_account_id()))
  with check (exists (select 1 from public.properties p where p.id = property_id and p.account_id = public.current_account_id()));

create table public.guest_requests (
  id uuid primary key default gen_random_uuid(),
  guest_link_id uuid not null references public.guest_links(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  guest_name text not null,
  guest_email text,
  guest_phone text,
  start_date date not null,
  end_date date not null,
  guests integer not null default 1,
  note text,
  status text not null default 'PENDING',
  created_at timestamptz not null default now()
);
grant select, update on public.guest_requests to authenticated;
grant all on public.guest_requests to service_role;
alter table public.guest_requests enable row level security;
create policy "Members read own account guest requests" on public.guest_requests for select to authenticated
  using (exists (select 1 from public.properties p where p.id = property_id and p.account_id = public.current_account_id()));
create policy "Admins decide guest requests" on public.guest_requests for update to authenticated
  using (public.has_role(auth.uid(), 'admin') and exists (select 1 from public.properties p where p.id = property_id and p.account_id = public.current_account_id()));

create or replace function public.public_guest_link(_token text)
returns table(id uuid, property_id uuid, property_name text, property_address text, valid_from date, valid_to date)
language sql stable security definer set search_path = public as $$
  select gl.id, gl.property_id, p.name, p.address, gl.valid_from, gl.valid_to
  from public.guest_links gl join public.properties p on p.id = gl.property_id
  where gl.token = _token and gl.revoked_at is null and (gl.expires_at is null or gl.expires_at > now())
  limit 1
$$;
grant execute on function public.public_guest_link(text) to anon, authenticated;

create table public.property_photos (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  storage_path text not null,
  uploaded_by_member_id uuid references public.members(id),
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index property_photos_one_primary on public.property_photos (property_id) where is_primary;
grant select, insert, update, delete on public.property_photos to authenticated;
grant all on public.property_photos to service_role;
alter table public.property_photos enable row level security;
create policy "Members manage own account photos" on public.property_photos for all to authenticated
  using (exists (select 1 from public.properties p where p.id = property_id and p.account_id = public.current_account_id()))
  with check (exists (select 1 from public.properties p where p.id = property_id and p.account_id = public.current_account_id()));

create table public.onboarding_answers (
  user_id uuid primary key,
  answers jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.onboarding_answers to authenticated;
grant all on public.onboarding_answers to service_role;
alter table public.onboarding_answers enable row level security;
create policy "Users manage own onboarding answers" on public.onboarding_answers for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.consent_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  anonymous_id text,
  analytics boolean not null,
  version text not null,
  created_at timestamptz not null default now()
);
grant insert on public.consent_log to authenticated, anon;
grant all on public.consent_log to service_role;
alter table public.consent_log enable row level security;
create policy "Anyone can log consent" on public.consent_log for insert to anon, authenticated with check (true);

create table public.org_join_requests (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  user_id uuid not null,
  email text not null,
  status text not null default 'PENDING',
  created_at timestamptz not null default now()
);
grant select, insert, update on public.org_join_requests to authenticated;
grant all on public.org_join_requests to service_role;
alter table public.org_join_requests enable row level security;
create policy "Users create own join requests" on public.org_join_requests for insert to authenticated
  with check (user_id = auth.uid());
create policy "Admins read join requests" on public.org_join_requests for select to authenticated
  using (account_id = public.current_account_id() and public.has_role(auth.uid(), 'admin'));
create policy "Admins update join requests" on public.org_join_requests for update to authenticated
  using (account_id = public.current_account_id() and public.has_role(auth.uid(), 'admin'));

create table public.manual_chunks (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  section_id uuid references public.manual_sections(id) on delete cascade,
  content text not null,
  embedding vector(768),
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.manual_chunks to authenticated;
grant all on public.manual_chunks to service_role;
alter table public.manual_chunks enable row level security;
create policy "Members read own account chunks" on public.manual_chunks for select to authenticated
  using (exists (select 1 from public.properties p where p.id = property_id and p.account_id = public.current_account_id()));
create policy "Admins insert chunks" on public.manual_chunks for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin') and exists (select 1 from public.properties p where p.id = property_id and p.account_id = public.current_account_id()));
create policy "Admins delete chunks" on public.manual_chunks for delete to authenticated
  using (public.has_role(auth.uid(), 'admin') and exists (select 1 from public.properties p where p.id = property_id and p.account_id = public.current_account_id()));

create or replace function public.match_manual_chunks(_property_id uuid, _embedding vector(768), _count int default 5)
returns table(id uuid, section_id uuid, content text, similarity float)
language sql stable security definer set search_path = public as $$
  select mc.id, mc.section_id, mc.content, 1 - (mc.embedding <=> _embedding) as similarity
  from public.manual_chunks mc
  where mc.property_id = _property_id and mc.embedding is not null
  order by mc.embedding <=> _embedding
  limit _count
$$;
grant execute on function public.match_manual_chunks(uuid, vector, int) to authenticated;
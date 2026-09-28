-- T-019: invitation fixes found in the 28 Sep review.
-- 1. The members page saved roles in lower case ('admin'), but accept_invitation only
--    recognised 'ADMIN', so every admin invitation produced a plain member (B-011).
-- 2. An unknown, expired or already-used link returned null, which the page showed as
--    "Welcome to the cottage!" (B-012). It now raises a specific error.
-- 3. Someone already in the account who is invited as admin is now made admin.
-- 4. invitation_preview(token) lets the invitation page show what the link is for, and
--    whether the signed-in person can use it, before accepting (B-013).

update public.invitations set role = upper(role) where role <> upper(role);

create or replace function public.invitations_normalise_role()
returns trigger language plpgsql set search_path = public as $$
begin
  new.role := upper(coalesce(new.role, 'MEMBER'));
  new.email := nullif(lower(trim(new.email)), '');
  return new;
end;
$$;
drop trigger if exists invitations_normalise_role on public.invitations;
create trigger invitations_normalise_role before insert or update on public.invitations
  for each row execute function public.invitations_normalise_role();

alter table public.invitations drop constraint if exists invitations_role_check;
alter table public.invitations
  add constraint invitations_role_check check (role in ('ADMIN', 'MEMBER', 'OWNER'));

create or replace function public.accept_invitation(_token text)
returns uuid language plpgsql security definer set search_path = public as $$
declare inv public.invitations; new_member uuid; inviter_branch text; caller_email text; display text;
begin
  if auth.uid() is null then
    raise exception 'invitation_sign_in_required' using errcode = '42501';
  end if;

  select * into inv from public.invitations where token = _token for update;
  if not found then
    raise exception 'invitation_not_found' using errcode = '22023';
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

-- What the invitation page may show before anyone accepts. The token is unguessable, the email
-- is masked (j***@gmail.com), and nothing else about the account is returned.
create or replace function public.invitation_preview(_token text)
returns table (
  state text,             -- valid | expired | used | not_found
  account_name text,
  property_name text,
  role text,
  invited_by text,
  email_hint text,        -- masked; null when the link works for any email
  email_matches boolean   -- null when not signed in
)
language plpgsql stable security definer set search_path = public as $$
declare inv public.invitations; caller_email text;
begin
  select * into inv from public.invitations where token = _token;
  if not found then
    return query select 'not_found'::text, null::text, null::text, null::text, null::text, null::text, null::boolean;
    return;
  end if;
  caller_email := nullif(lower(coalesce(auth.jwt()->>'email', '')), '');
  return query
  select
    case when inv.status <> 'PENDING' then 'used'
         when inv.expires_at <= now() then 'expired'
         else 'valid' end,
    (select a.name from public.accounts a where a.id = inv.account_id),
    (select p.name from public.properties p where p.id = inv.property_id),
    upper(inv.role),
    (select m.name from public.members m where m.id = inv.created_by_member_id),
    case when coalesce(inv.email, '') = '' then null
         else left(split_part(inv.email, '@', 1), 1) || '***@' || split_part(inv.email, '@', 2) end,
    case when caller_email is null then null
         else coalesce(inv.email, '') = '' or lower(inv.email) = caller_email end;
end;
$$;
grant execute on function public.invitation_preview(text) to anon, authenticated;

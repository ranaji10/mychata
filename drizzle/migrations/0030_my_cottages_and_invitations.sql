-- 0030: what a person can see across ALL their accounts, not only the open one
-- (T-040, bugs of 18 Oct 2026).
--
-- properties is readable only for the open account (current_account_id()), so the cottage
-- switcher could list the cottages of the open account but only "Switch to …" for the others
-- (bug 16: 5 rows from one account, 3 from another). My profile's summary (bug 9) needs the
-- same list. invitations is readable by admins only, so an invitee could not see an invitation
-- waiting for them in Notifications (bug 5).
--
-- Both functions return only rows about the caller: cottages of accounts they are a member of,
-- and pending invitations addressed to their own sign-in email in accounts they have not joined.

create or replace function public.my_cottages()
returns table (account_id uuid, property_id uuid, name text, city text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select p.account_id, p.id, p.name, p.city, p.created_at
  from public.properties p
  where auth.uid() is not null
    and p.account_id in (select m.account_id from public.members m where m.user_id = auth.uid())
  order by p.account_id, p.created_at, p.id
$$;
revoke execute on function public.my_cottages() from public, anon;
grant execute on function public.my_cottages() to authenticated;

create or replace function public.my_invitations()
returns table (
  token text,
  account_name text,
  account_type text,
  property_name text,
  role text,
  invited_by text,
  created_at timestamptz,
  expires_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select i.token, a.name, a.type, p.name, upper(i.role), m.name, i.created_at, i.expires_at
  from public.invitations i
  join public.accounts a on a.id = i.account_id
  left join public.properties p on p.id = i.property_id
  left join public.members m on m.id = i.created_by_member_id
  where auth.uid() is not null
    and i.status = 'PENDING'
    and i.expires_at > now()
    and coalesce(i.email, '') <> ''
    and lower(i.email) = nullif(lower(coalesce(auth.jwt()->>'email', '')), '')
    and not exists (
      select 1 from public.members me where me.account_id = i.account_id and me.user_id = auth.uid()
    )
  order by i.created_at desc
$$;
revoke execute on function public.my_invitations() from public, anon;
grant execute on function public.my_invitations() to authenticated;

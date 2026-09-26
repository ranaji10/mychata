-- 0017 People who join an existing account skip onboarding (bug B-003)
-- Before: when a sign-in was linked to a member row an admin had created (matching email),
-- onboarding_completed_at stayed empty, so the app sent the person into onboarding, which then
-- tried to add a chata to someone else's account and failed with "Admin role required" (42501).

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

  -- Joining an existing account is onboarding enough.
  insert into public.profiles (user_id, member_id, active_account_id, onboarding_completed_at)
  select auth.uid(), claimed_member, account_id, now() from public.members where id = claimed_member
  on conflict (user_id) do update
    set member_id = coalesce(public.profiles.member_id, excluded.member_id),
        active_account_id = coalesce(public.profiles.active_account_id, excluded.active_account_id),
        onboarding_completed_at = coalesce(public.profiles.onboarding_completed_at, now());
  return claimed_member;
end;
$$;

-- Backfill: anyone who already belongs to an account is past onboarding.
update public.profiles p
set onboarding_completed_at = now()
where p.onboarding_completed_at is null
  and exists (select 1 from public.members m where m.user_id = p.user_id);
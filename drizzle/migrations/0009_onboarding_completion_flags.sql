UPDATE public.profiles SET onboarding_completed_at = now()
WHERE onboarding_completed_at IS NULL AND member_id IN (
 'c0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000002','c0000000-0000-4000-8000-000000000003','c0000000-0000-4000-8000-000000000004','c0000000-0000-4000-8000-000000000010');

CREATE OR REPLACE FUNCTION public.accept_invitation(_token text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
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
  insert into public.profiles (user_id, member_id, onboarding_completed_at) values (auth.uid(), new_member, now())
  on conflict (user_id) do update set member_id = excluded.member_id, onboarding_completed_at = coalesce(public.profiles.onboarding_completed_at, now());
  insert into public.user_roles (user_id, role)
  values (auth.uid(), case when inv.role in ('ADMIN','OWNER') then 'admin'::public.app_role else 'member'::public.app_role end)
  on conflict do nothing;
  if inv.property_id is not null then
    insert into public.property_admins (property_id, member_id) values (inv.property_id, new_member) on conflict do nothing;
  end if;
  update public.invitations set status = 'ACCEPTED', accepted_by = auth.uid() where id = inv.id;
  return new_member;
end;
$function$;
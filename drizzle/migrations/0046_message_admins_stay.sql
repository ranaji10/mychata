-- 0046: "Message the admin" carries the stay it is about (T-064, tracker O-26).
-- UX round 5 Nov 2026 (U-7): the admin's notification "Message from …" led nowhere, because the
-- message only named dates. message_admins takes an optional _booking_id; the stay must belong
-- to the same account. It goes into the payload as booking_id, with the sender's member id, so
-- the app and the e-mail can open the stay where the admin approves or declines it.
-- The two-argument version is replaced (dropped, then created with a default), so callers that
-- still send two arguments keep working and PostgREST sees one function. Grants restated.
drop function if exists public.message_admins(uuid, text);
--> statement-breakpoint
create or replace function public.message_admins(
  _account_id uuid, _body text, _booking_id uuid default null
)
returns integer language plpgsql security definer set search_path = public as $$
declare me public.members; acct text; m record; n int := 0; txt text := btrim(coalesce(_body, ''));
begin
  select * into me from public.members
  where account_id = _account_id and user_id = auth.uid() and left_at is null;
  if not found then raise exception 'not_a_member' using errcode = '42501'; end if;
  if char_length(txt) not between 1 and 1000 then
    raise exception 'invalid_body' using errcode = '22023';
  end if;
  if _booking_id is not null and not exists (
    select 1 from public.bookings b join public.properties p on p.id = b.property_id
    where b.id = _booking_id and p.account_id = _account_id
  ) then
    raise exception 'not_found' using errcode = '22023';
  end if;
  if not exists (select 1 from public.members
                 where account_id = _account_id and role in ('ADMIN', 'OWNER')
                   and left_at is null and user_id is not null and id <> me.id) then
    raise exception 'no_admin' using errcode = '22023';
  end if;
  if not public.bump_usage('message_admins', 10) then
    raise exception 'rate_limited' using errcode = '54000';
  end if;
  select name into acct from public.accounts where id = _account_id;
  for m in select id from public.members
           where account_id = _account_id and role in ('ADMIN', 'OWNER')
             and left_at is null and user_id is not null and id <> me.id loop
    perform public.notify_enqueue(_account_id, 'message_to_admin', m.id, null, null,
      jsonb_strip_nulls(jsonb_build_object('from_name', me.name, 'from_member_id', me.id,
        'account_name', acct, 'body', txt, 'booking_id', _booking_id)), null);
    n := n + 1;
  end loop;
  return n;
end;
$$;
--> statement-breakpoint
revoke execute on function public.message_admins(uuid, text, uuid) from public, anon;
--> statement-breakpoint
grant execute on function public.message_admins(uuid, text, uuid) to authenticated;

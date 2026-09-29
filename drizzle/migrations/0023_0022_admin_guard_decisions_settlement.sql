-- T-021: fixes from the 28 Sep walkthrough (after the demo data was removed).
-- 1. Every account keeps at least one admin. An account left without one gets its oldest
--    signed-in member promoted, and "Admin of this cottage" rows of people who are no
--    longer admins are removed (the members page showed a stale green badge).
-- 2. decide_guest_request(): approving or declining a guest's request is one admin-only
--    step that writes the booking and the decision together. Before, the browser wrote a
--    booking (allowed for any member) and then the decision, with nothing checked or shown.
-- 3. settle_debt(): "Confirm payment received" settles BOTH directions between two people.
--    Before, only one direction was marked paid, so the other half reappeared as a new
--    debt, and a member who wasn't the receiver got "saved" while nothing changed.
-- 4. update_property_details(): admins can fill in what onboarding skipped (address,
--    city, rooms, busy seasons, overlap rule) from My profile.
-- 5. documents: text read from uploaded files, so the manual's question box can answer
--    from the Document Vault too (T-020 stage 1: no vectors yet, see docs/architecture/rag.md).

-- 1. Admin guard ------------------------------------------------------------------------

update public.members m set role = 'ADMIN'
where m.id in (
  select distinct on (x.account_id) x.id
  from public.members x
  where x.user_id is not null
    and not exists (
      select 1 from public.members a
      where a.account_id = x.account_id and a.role in ('ADMIN', 'OWNER'))
  order by x.account_id, x.created_at
);

delete from public.property_admins pa
using public.members m
where m.id = pa.member_id and m.role not in ('ADMIN', 'OWNER');

-- 2. Guest requests ---------------------------------------------------------------------

create or replace function public.decide_guest_request(_request_id uuid, _approve boolean)
returns uuid language plpgsql security definer set search_path = public as $$
declare req public.guest_requests; acct uuid; new_booking uuid;
begin
  select * into req from public.guest_requests where id = _request_id for update;
  if not found then raise exception 'request_not_found' using errcode = '22023'; end if;
  select account_id into acct from public.properties where id = req.property_id;
  if acct is null or not public.has_account_role(acct, 'admin') then
    raise exception 'Admin role required' using errcode = '42501';
  end if;
  if req.status <> 'PENDING' then raise exception 'already_decided' using errcode = '22023'; end if;

  if _approve then
    insert into public.bookings (property_id, requester_name, requester_member_id, start_date,
                                 end_date, guests, note, status)
    values (req.property_id, req.guest_name, null, req.start_date, req.end_date, req.guests,
            req.note, 'CONFIRMED')
    returning id into new_booking;
  end if;
  update public.guest_requests set status = case when _approve then 'APPROVED' else 'DECLINED' end
  where id = req.id;
  return new_booking;
end;
$$;
revoke execute on function public.decide_guest_request(uuid, boolean) from public, anon;
grant execute on function public.decide_guest_request(uuid, boolean) to authenticated;

-- 3. Settling up ------------------------------------------------------------------------

create or replace function public.settle_debt(_property_id uuid, _from uuid, _to uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare acct uuid; me uuid; changed integer;
begin
  select account_id into acct from public.properties where id = _property_id;
  if acct is null or not public.is_member(acct) then
    raise exception 'not_a_member' using errcode = '42501';
  end if;
  select id into me from public.members where account_id = acct and user_id = auth.uid();
  -- The person who receives the money confirms it; an admin may confirm for anyone.
  if me is distinct from _to and not public.has_account_role(acct, 'admin') then
    raise exception 'only_receiver_confirms' using errcode = '42501';
  end if;
  if (select count(*) from public.members where id in (_from, _to) and account_id = acct) <> 2 then
    raise exception 'members_not_in_account' using errcode = '22023';
  end if;

  update public.expense_splits s
  set paid_back = true, paid_back_confirmed_by = me
  from public.expenses e
  where e.id = s.expense_id
    and e.property_id = _property_id
    and not s.paid_back
    and ((s.member_id = _from and e.paid_by_member_id = _to)
      or (s.member_id = _to and e.paid_by_member_id = _from));
  get diagnostics changed = row_count;
  return changed;
end;
$$;
revoke execute on function public.settle_debt(uuid, uuid, uuid) from public, anon;
grant execute on function public.settle_debt(uuid, uuid, uuid) to authenticated;

-- 4. Cottage details after onboarding ---------------------------------------------------

create or replace function public.update_property_details(
  _property_id uuid,
  _address text default null,
  _city text default null,
  _rooms int default null,
  _seasons text[] default null,
  _overlap_max_guests int default null
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
  update public.properties set
    address = coalesce(nullif(trim(_address), ''), address),
    city = coalesce(nullif(trim(_city), ''), city),
    rooms = coalesce(_rooms, rooms),
    peak_seasons = coalesce(_seasons, peak_seasons),
    overlap_max_guests = coalesce(_overlap_max_guests, overlap_max_guests)
  where id = _property_id;
end;
$$;
revoke execute on function public.update_property_details(uuid, text, text, int, text[], int) from public, anon;
grant execute on function public.update_property_details(uuid, text, text, int, text[], int) to authenticated;

-- 5. Document text for questions ---------------------------------------------------------
-- Written by the server function that reads the file, with the admin's own session, so the
-- existing policy "Admins manage own documents" applies. Members only ever read the text of
-- documents they may already see.

alter table public.documents
  add column if not exists extracted_text text,
  add column if not exists text_status text not null default 'pending',
  add column if not exists text_error text,
  add column if not exists text_updated_at timestamptz;

alter table public.documents drop constraint if exists documents_text_status_check;
alter table public.documents
  add constraint documents_text_status_check
  check (text_status in ('pending', 'ready', 'failed', 'no_file'));

update public.documents set text_status = 'no_file' where file_url is null and text_status = 'pending';

-- Kill switch for sending uploaded files to the AI gateway to read their text.
insert into public.feature_flags (key, note)
values ('ai_documents', 'Reading uploaded documents through the AI gateway (Document Vault answers)')
on conflict (key) do nothing;
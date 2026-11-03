-- 0038 Stored notifications with an e-mail queue, task notes with @-mentions (T-053, CC-3)
--
-- 1. notifications: one row per thing a person should hear about. Exactly one recipient: a
--    member, a signed-in user who isn't a member (public-calendar requester, T-043), or an
--    e-mail address (an invitee, a guest without an account). Recipients read and mark read only
--    their own; nobody else reads them and nobody inserts directly. The e-mail columns are the
--    queue the cron route /api/notifications/send-emails works through (service role).
-- 2. Triggers create them, so today's screens need no change: a stay waiting for approval, a
--    stay confirmed or declined, a guest request decided, an ownership offer, an invitation with
--    an e-mail, and the leaving checklist for the member with the next confirmed stay.
-- 3. task_notes + task_note_mentions: notes on maintenance tasks. Written through add_task_note,
--    which refuses a mention of a member from another account or one who has left.
-- 4. message_admins and remind_debt for L-3's "Napsat správci" and "Připomenout"; both create
--    notifications and never reveal an address.
-- Every e-mail one person causes counts in usage_counters ('notification_email'); above 60 a day
-- the notification is still stored but not e-mailed.

-- 1. notifications -------------------------------------------------------------------------

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  recipient_member_id uuid references public.members (id) on delete cascade,
  recipient_user_id uuid,
  recipient_email text,
  kind text not null check (kind in (
    'invitation', 'booking_awaiting_approval', 'booking_decided', 'guest_request_decided',
    'ownership_offered', 'task_mentioned', 'leaving_checklist', 'message_to_admin',
    'debt_reminder'
  )),
  payload jsonb not null default '{}'::jsonb,
  sender_user_id uuid,
  dedupe_key text unique,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  email_wanted boolean not null default true,
  emailed_at timestamptz,
  email_attempts integer not null default 0,
  email_next_at timestamptz not null default now(),
  email_error text,
  constraint notifications_one_recipient
    check (num_nonnulls(recipient_member_id, recipient_user_id, recipient_email) = 1)
);
--> statement-breakpoint
create index if not exists notifications_member_idx
  on public.notifications (recipient_member_id, created_at desc);
--> statement-breakpoint
create index if not exists notifications_user_idx
  on public.notifications (recipient_user_id, created_at desc);
--> statement-breakpoint
create index if not exists notifications_email_queue_idx
  on public.notifications (email_next_at) where emailed_at is null and email_wanted;
--> statement-breakpoint
alter table public.notifications enable row level security;
--> statement-breakpoint
revoke all on public.notifications from anon, authenticated;
--> statement-breakpoint
-- Not sender_user_id or the e-mail columns: a recipient has no use for them.
grant select (id, account_id, recipient_member_id, recipient_user_id, kind, payload, created_at,
              read_at)
  on public.notifications to authenticated;
--> statement-breakpoint
grant all on public.notifications to service_role;
--> statement-breakpoint
-- A member who left has no sign-in on that row any more (leave_account), so they lose access.
create policy "Recipients read their own notifications" on public.notifications
  for select to authenticated
  using (recipient_user_id = auth.uid()
         or recipient_member_id in (select id from public.members where user_id = auth.uid()));
--> statement-breakpoint

-- Internal: the one place notifications are created. Skips a member who left or has no sign-in
-- and never notifies the person who caused it, except the leaving checklist (booking your own
-- stay is what passes it on to you). dedupe_key makes a repeated event a no-op.
create or replace function public.notify_enqueue(
  _account_id uuid, _kind text, _member_id uuid, _user_id uuid, _email text, _payload jsonb,
  _dedupe text
) returns void language plpgsql security definer set search_path = public as $$
declare rcpt public.members; n int; wanted boolean := true; err text;
begin
  if _member_id is not null then
    select * into rcpt from public.members where id = _member_id;
    if not found or rcpt.left_at is not null or rcpt.user_id is null
       or rcpt.account_id <> _account_id then
      return;
    end if;
    if rcpt.user_id = auth.uid() and _kind <> 'leaving_checklist' then return; end if;
  elsif _user_id is not null then
    if _user_id = auth.uid() then return; end if;
  else
    _email := lower(btrim(coalesce(_email, '')));
    if _email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return; end if;
  end if;
  if auth.uid() is not null then
    insert into public.usage_counters (user_id, kind, day, count)
    values (auth.uid(), 'notification_email', current_date, 1)
    on conflict (user_id, kind, day) do update set count = public.usage_counters.count + 1
    returning count into n;
    if n > 60 then wanted := false; err := 'rate_limited'; end if;
  end if;
  insert into public.notifications (account_id, recipient_member_id, recipient_user_id,
    recipient_email, kind, payload, sender_user_id, dedupe_key, email_wanted, email_error)
  values (_account_id, _member_id,
          case when _member_id is null then _user_id end,
          case when _member_id is null and _user_id is null then _email end,
          _kind, coalesce(_payload, '{}'::jsonb), auth.uid(), _dedupe, wanted, err)
  on conflict (dedupe_key) do nothing;
end;
$$;
--> statement-breakpoint
revoke execute on function public.notify_enqueue(uuid, text, uuid, uuid, text, jsonb, text)
  from public, anon, authenticated;
--> statement-breakpoint

create or replace function public.mark_notifications_read(_ids uuid[])
returns integer language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if auth.uid() is null then raise exception 'not_signed_in' using errcode = '42501'; end if;
  update public.notifications set read_at = now()
  where id = any(_ids) and read_at is null
    and (recipient_user_id = auth.uid()
         or recipient_member_id in (select id from public.members where user_id = auth.uid()));
  get diagnostics n = row_count;
  return n;
end;
$$;
--> statement-breakpoint
revoke execute on function public.mark_notifications_read(uuid[]) from public, anon;
--> statement-breakpoint
grant execute on function public.mark_notifications_read(uuid[]) to authenticated;
--> statement-breakpoint

-- 2. Triggers ------------------------------------------------------------------------------

-- Stays: waiting for approval (to admins and the cottage's admins), confirmed or declined (to
-- the person who asked). Declining a stay deletes it (schvalovani.tsx), so a delete of a
-- PENDING stay by someone else is a decline; a delete because the cottage itself is being
-- deleted is not (the cottage row is already gone).
create or replace function public.notify_on_booking()
returns trigger language plpgsql security definer set search_path = public as $$
declare prop public.properties; who text; b public.bookings; m record;
begin
  b := case when tg_op = 'DELETE' then old else new end;
  select * into prop from public.properties where id = b.property_id;
  if not found then return null; end if;
  select name into who from public.members
  where account_id = prop.account_id and user_id = auth.uid() limit 1;
  if tg_op = 'INSERT' and new.status = 'PENDING' then
    for m in
      select mm.id from public.members mm
      where mm.account_id = prop.account_id and mm.left_at is null and mm.user_id is not null
        and mm.id is distinct from new.requester_member_id
        and (mm.role in ('ADMIN', 'OWNER')
             or exists (select 1 from public.property_admins pa
                        where pa.property_id = prop.id and pa.member_id = mm.id))
    loop
      perform public.notify_enqueue(prop.account_id, 'booking_awaiting_approval', m.id, null,
        null,
        jsonb_build_object('booking_id', new.id, 'property_name', prop.name,
          'requester_name', new.requester_name, 'start_date', new.start_date,
          'end_date', new.end_date, 'guests', new.guests),
        'booking_awaiting_approval:' || new.id || ':' || m.id);
    end loop;
  elsif tg_op = 'UPDATE' and old.status = 'PENDING' and new.status = 'CONFIRMED'
        and new.requester_member_id is not null then
    perform public.notify_enqueue(prop.account_id, 'booking_decided', new.requester_member_id,
      null, null,
      jsonb_build_object('booking_id', new.id, 'approved', true, 'property_name', prop.name,
        'start_date', new.start_date, 'end_date', new.end_date, 'decided_by', who),
      'booking_decided:' || new.id);
  elsif tg_op = 'DELETE' and old.status = 'PENDING' and old.requester_member_id is not null then
    perform public.notify_enqueue(prop.account_id, 'booking_decided', old.requester_member_id,
      null, null,
      jsonb_build_object('booking_id', old.id, 'approved', false, 'property_name', prop.name,
        'start_date', old.start_date, 'end_date', old.end_date, 'decided_by', who),
      'booking_decided:' || old.id);
  end if;
  if tg_op <> 'DELETE' and new.status = 'CONFIRMED'
     and (tg_op = 'INSERT' or old.status is distinct from 'CONFIRMED') then
    perform public.forward_leaving_checklist_to(new.id);
  end if;
  return null;
end;
$$;
--> statement-breakpoint

-- The leaving checklist (the last handover: done and skipped items, the note) goes to the member
-- with the next confirmed stay at that cottage. Internal.
create or replace function public.notify_leaving_checklist(_handover_id uuid, _booking_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare h public.handovers; b public.bookings; prop public.properties; author text;
        done jsonb; skipped jsonb;
begin
  select * into h from public.handovers where id = _handover_id;
  select * into b from public.bookings where id = _booking_id;
  if h.id is null or b.id is null or b.requester_member_id is null then return; end if;
  select * into prop from public.properties where id = h.property_id;
  select name into author from public.members where id = h.member_id;
  select coalesce(jsonb_agg(e.key order by e.key)
           filter (where e.value ->> 'state' = 'checked'), '[]'::jsonb),
         coalesce(jsonb_agg(jsonb_build_object('item', e.key, 'reason', e.value ->> 'reason')
           order by e.key) filter (where coalesce(e.value ->> 'state', '') <> 'checked'),
           '[]'::jsonb)
    into done, skipped
  from jsonb_each(case when jsonb_typeof(h.checklist_state) = 'object'
                       then h.checklist_state else '{}'::jsonb end) e;
  perform public.notify_enqueue(prop.account_id, 'leaving_checklist', b.requester_member_id,
    null, null,
    jsonb_build_object('handover_id', h.id, 'property_name', prop.name, 'from_name', author,
      'submitted_at', h.submitted_at, 'done', done, 'skipped', skipped,
      'note', left(coalesce(h.note, ''), 500), 'start_date', b.start_date,
      'end_date', b.end_date),
    'leaving_checklist:' || h.id);
end;
$$;
--> statement-breakpoint
revoke execute on function public.notify_leaving_checklist(uuid, uuid)
  from public, anon, authenticated;
--> statement-breakpoint

-- The next confirmed stay after a handover, not the leaver's own, by a member who can be told.
create or replace function public.next_stay_after_handover(_handover_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select b.id
  from public.handovers h
  join public.bookings b on b.property_id = h.property_id and b.status = 'CONFIRMED'
  join public.members m on m.id = b.requester_member_id
  where h.id = _handover_id
    and b.start_date >= (h.submitted_at at time zone 'Europe/Prague')::date
    and b.requester_member_id is distinct from h.member_id
    and m.left_at is null and m.user_id is not null
  order by b.start_date, b.created_at
  limit 1
$$;
--> statement-breakpoint
revoke execute on function public.next_stay_after_handover(uuid)
  from public, anon, authenticated;
--> statement-breakpoint

-- When a stay is confirmed: if the cottage's latest handover hasn't been passed on yet and this
-- is now the next stay after it, pass it on. Internal.
create or replace function public.forward_leaving_checklist_to(_booking_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare b public.bookings; last_h uuid;
begin
  select * into b from public.bookings where id = _booking_id;
  if not found then return; end if;
  select id into last_h from public.handovers
  where property_id = b.property_id order by submitted_at desc, id limit 1;
  if last_h is null then return; end if;
  if exists (select 1 from public.notifications where dedupe_key = 'leaving_checklist:' || last_h)
  then return; end if;
  if public.next_stay_after_handover(last_h) = _booking_id then
    perform public.notify_leaving_checklist(last_h, _booking_id);
  end if;
end;
$$;
--> statement-breakpoint
revoke execute on function public.forward_leaving_checklist_to(uuid)
  from public, anon, authenticated;
--> statement-breakpoint
revoke execute on function public.notify_on_booking() from public, anon, authenticated;
--> statement-breakpoint
drop trigger if exists bookings_notify on public.bookings;
--> statement-breakpoint
create trigger bookings_notify after insert or update of status or delete on public.bookings
  for each row execute function public.notify_on_booking();
--> statement-breakpoint

create or replace function public.notify_on_handover()
returns trigger language plpgsql security definer set search_path = public as $$
declare nxt uuid;
begin
  nxt := public.next_stay_after_handover(new.id);
  if nxt is not null then
    perform public.notify_leaving_checklist(new.id, nxt);
  end if;
  return null;
end;
$$;
--> statement-breakpoint
revoke execute on function public.notify_on_handover() from public, anon, authenticated;
--> statement-breakpoint
drop trigger if exists handovers_notify on public.handovers;
--> statement-breakpoint
create trigger handovers_notify after insert on public.handovers
  for each row execute function public.notify_on_handover();
--> statement-breakpoint

-- Guest and public-calendar requests: the decision goes to the requester's sign-in, else to the
-- e-mail a guest left on the guest form.
create or replace function public.notify_on_guest_request()
returns trigger language plpgsql security definer set search_path = public as $$
declare prop public.properties;
begin
  if old.status <> 'PENDING' or new.status not in ('APPROVED', 'DECLINED') then return null; end if;
  select * into prop from public.properties where id = new.property_id;
  if not found then return null; end if;
  perform public.notify_enqueue(prop.account_id, 'guest_request_decided', null,
    new.requester_user_id,
    case when new.requester_user_id is null then new.guest_email end,
    jsonb_build_object('request_id', new.id, 'approved', new.status = 'APPROVED',
      'property_name', prop.name, 'start_date', new.start_date, 'end_date', new.end_date,
      'source', new.source,
      'calendar_token', case when new.source = 'public_calendar' then prop.public_token end),
    'guest_request_decided:' || new.id);
  return null;
end;
$$;
--> statement-breakpoint
revoke execute on function public.notify_on_guest_request() from public, anon, authenticated;
--> statement-breakpoint
drop trigger if exists guest_requests_notify on public.guest_requests;
--> statement-breakpoint
create trigger guest_requests_notify after update of status on public.guest_requests
  for each row execute function public.notify_on_guest_request();
--> statement-breakpoint

create or replace function public.notify_on_ownership_offer()
returns trigger language plpgsql security definer set search_path = public as $$
declare acct text; from_name text;
begin
  if new.status <> 'PENDING' then return null; end if;
  select name into acct from public.accounts where id = new.account_id;
  select name into from_name from public.members where id = new.from_member_id;
  perform public.notify_enqueue(new.account_id, 'ownership_offered', new.to_member_id, null, null,
    jsonb_build_object('offer_id', new.id, 'account_name', acct, 'from_name', from_name),
    'ownership_offered:' || new.id);
  return null;
end;
$$;
--> statement-breakpoint
revoke execute on function public.notify_on_ownership_offer() from public, anon, authenticated;
--> statement-breakpoint
drop trigger if exists ownership_offers_notify on public.ownership_offers;
--> statement-breakpoint
create trigger ownership_offers_notify after insert on public.ownership_offers
  for each row execute function public.notify_on_ownership_offer();
--> statement-breakpoint

-- An invitation with an e-mail is e-mailed; "Kopírovat odkaz" and "Poslat z mé pošty" stay.
create or replace function public.notify_on_invitation()
returns trigger language plpgsql security definer set search_path = public as $$
declare acct text; prop text; inviter text;
begin
  if nullif(btrim(coalesce(new.email, '')), '') is null or new.status <> 'PENDING' then
    return null;
  end if;
  select name into acct from public.accounts where id = new.account_id;
  select name into prop from public.properties where id = new.property_id;
  select name into inviter from public.members where id = new.created_by_member_id;
  perform public.notify_enqueue(new.account_id, 'invitation', null, null, new.email,
    jsonb_build_object('token', new.token, 'account_name', acct, 'property_name', prop,
      'invited_by', inviter, 'expires_at', new.expires_at),
    'invitation:' || new.id);
  return null;
end;
$$;
--> statement-breakpoint
revoke execute on function public.notify_on_invitation() from public, anon, authenticated;
--> statement-breakpoint
drop trigger if exists invitations_notify on public.invitations;
--> statement-breakpoint
create trigger invitations_notify after insert on public.invitations
  for each row execute function public.notify_on_invitation();
--> statement-breakpoint

-- For the handover screen (L-3): who gets this checklist, and whether it has gone already.
create or replace function public.handover_next_recipient(_handover_id uuid)
returns table (member_name text, start_date date, end_date date, sent boolean)
language plpgsql stable security definer set search_path = public as $$
declare acct uuid; nxt uuid;
begin
  select p.account_id into acct from public.handovers h
  join public.properties p on p.id = h.property_id where h.id = _handover_id;
  if acct is null or not public.is_member(acct) then
    raise exception 'not_a_member' using errcode = '42501';
  end if;
  nxt := public.next_stay_after_handover(_handover_id);
  return query
    select m.name, b.start_date, b.end_date,
           exists (select 1 from public.notifications
                   where dedupe_key = 'leaving_checklist:' || _handover_id)
    from public.bookings b join public.members m on m.id = b.requester_member_id
    where b.id = nxt;
end;
$$;
--> statement-breakpoint
revoke execute on function public.handover_next_recipient(uuid) from public, anon;
--> statement-breakpoint
grant execute on function public.handover_next_recipient(uuid) to authenticated;
--> statement-breakpoint

-- 3. Task notes ----------------------------------------------------------------------------

create table if not exists public.task_notes (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  task_id uuid not null references public.tasks (id) on delete cascade,
  author_member_id uuid references public.members (id) on delete set null,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
--> statement-breakpoint
create index if not exists task_notes_task_idx on public.task_notes (task_id, created_at);
--> statement-breakpoint
alter table public.task_notes enable row level security;
--> statement-breakpoint
revoke all on public.task_notes from anon, authenticated;
--> statement-breakpoint
grant select, delete on public.task_notes to authenticated;
--> statement-breakpoint
grant update (body) on public.task_notes to authenticated;
--> statement-breakpoint
grant all on public.task_notes to service_role;
--> statement-breakpoint
create policy "Members read task notes" on public.task_notes
  for select to authenticated using (public.is_member(account_id));
--> statement-breakpoint
create policy "Authors edit their notes" on public.task_notes
  for update to authenticated
  using (author_member_id in (select id from public.members where user_id = auth.uid()))
  with check (author_member_id in (select id from public.members where user_id = auth.uid()));
--> statement-breakpoint
create policy "Authors delete their notes" on public.task_notes
  for delete to authenticated
  using (author_member_id in (select id from public.members where user_id = auth.uid()));
--> statement-breakpoint
drop trigger if exists task_notes_set_updated_at on public.task_notes;
--> statement-breakpoint
create trigger task_notes_set_updated_at before update on public.task_notes
  for each row execute function public.set_updated_at();
--> statement-breakpoint

create table if not exists public.task_note_mentions (
  note_id uuid not null references public.task_notes (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  primary key (note_id, member_id)
);
--> statement-breakpoint
alter table public.task_note_mentions enable row level security;
--> statement-breakpoint
revoke all on public.task_note_mentions from anon, authenticated;
--> statement-breakpoint
grant select on public.task_note_mentions to authenticated;
--> statement-breakpoint
grant all on public.task_note_mentions to service_role;
--> statement-breakpoint
create policy "Members read task note mentions" on public.task_note_mentions
  for select to authenticated using (public.is_member(account_id));
--> statement-breakpoint

-- Adds a note to a task, with up to 20 mentioned members of the same account (not ones who left).
create or replace function public.add_task_note(_task_id uuid, _body text,
  _mention_member_ids uuid[] default '{}')
returns uuid language plpgsql security definer set search_path = public as $$
declare t public.tasks; prop public.properties; me public.members; note uuid; m uuid;
        txt text := btrim(coalesce(_body, ''));
begin
  select * into t from public.tasks where id = _task_id;
  if found then select * into prop from public.properties where id = t.property_id; end if;
  if prop.id is null then raise exception 'not_a_member' using errcode = '42501'; end if;
  select * into me from public.members
  where account_id = prop.account_id and user_id = auth.uid() and left_at is null;
  if not found then raise exception 'not_a_member' using errcode = '42501'; end if;
  if char_length(txt) not between 1 and 2000 then
    raise exception 'invalid_body' using errcode = '22023';
  end if;
  if coalesce(array_length(_mention_member_ids, 1), 0) > 20 then
    raise exception 'too_many_mentions' using errcode = '22023';
  end if;
  foreach m in array coalesce(_mention_member_ids, '{}') loop
    if not exists (select 1 from public.members
                   where id = m and account_id = prop.account_id and left_at is null) then
      raise exception 'mention_not_in_account' using errcode = '22023';
    end if;
  end loop;
  if not public.bump_usage('task_note', 200) then
    raise exception 'rate_limited' using errcode = '54000';
  end if;
  insert into public.task_notes (account_id, task_id, author_member_id, body)
  values (prop.account_id, t.id, me.id, txt) returning id into note;
  for m in select distinct x from unnest(coalesce(_mention_member_ids, '{}')) x loop
    insert into public.task_note_mentions (note_id, member_id, account_id)
    values (note, m, prop.account_id);
    if m <> me.id then
      perform public.notify_enqueue(prop.account_id, 'task_mentioned', m, null, null,
        jsonb_build_object('task_id', t.id, 'task_title', coalesce(t.title_cs, t.title),
          'task_title_en', coalesce(t.title_en, t.title), 'note_id', note,
          'author_name', me.name, 'excerpt', left(txt, 300), 'property_name', prop.name),
        'task_mentioned:' || note || ':' || m);
    end if;
  end loop;
  return note;
end;
$$;
--> statement-breakpoint
revoke execute on function public.add_task_note(uuid, text, uuid[]) from public, anon;
--> statement-breakpoint
grant execute on function public.add_task_note(uuid, text, uuid[]) to authenticated;
--> statement-breakpoint

-- 4. Messages and reminders (L-3) ----------------------------------------------------------

-- "Napsat správci": a message to the account's admins, without showing anyone's address.
create or replace function public.message_admins(_account_id uuid, _body text)
returns integer language plpgsql security definer set search_path = public as $$
declare me public.members; acct text; m record; n int := 0; txt text := btrim(coalesce(_body, ''));
begin
  select * into me from public.members
  where account_id = _account_id and user_id = auth.uid() and left_at is null;
  if not found then raise exception 'not_a_member' using errcode = '42501'; end if;
  if char_length(txt) not between 1 and 1000 then
    raise exception 'invalid_body' using errcode = '22023';
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
      jsonb_build_object('from_name', me.name, 'account_name', acct, 'body', txt), null);
    n := n + 1;
  end loop;
  return n;
end;
$$;
--> statement-breakpoint
revoke execute on function public.message_admins(uuid, text) from public, anon;
--> statement-breakpoint
grant execute on function public.message_admins(uuid, text) to authenticated;
--> statement-breakpoint

-- "Připomenout": reminds a member what they owe the caller at this cottage; once a day per pair.
-- Returns the amount, or raises nothing_owed.
create or replace function public.remind_debt(_property_id uuid, _member_id uuid)
returns numeric language plpgsql security definer set search_path = public as $$
declare prop public.properties; me public.members; owed numeric;
begin
  select * into prop from public.properties where id = _property_id;
  if not found then raise exception 'not_a_member' using errcode = '42501'; end if;
  select * into me from public.members
  where account_id = prop.account_id and user_id = auth.uid() and left_at is null;
  if not found then raise exception 'not_a_member' using errcode = '42501'; end if;
  if not exists (select 1 from public.members
                 where id = _member_id and account_id = prop.account_id and left_at is null) then
    raise exception 'member_not_in_account' using errcode = '22023';
  end if;
  select coalesce(sum(s.amount_owed), 0) into owed
  from public.expense_splits s join public.expenses e on e.id = s.expense_id
  where e.property_id = _property_id and e.paid_by_member_id = me.id
    and s.member_id = _member_id and not s.paid_back;
  if owed <= 0 then raise exception 'nothing_owed' using errcode = '22023'; end if;
  if not public.bump_usage('debt_reminder', 10) then
    raise exception 'rate_limited' using errcode = '54000';
  end if;
  perform public.notify_enqueue(prop.account_id, 'debt_reminder', _member_id, null, null,
    jsonb_build_object('from_name', me.name, 'amount', owed, 'property_name', prop.name,
      'property_id', prop.id),
    'debt_reminder:' || me.id || ':' || _member_id || ':' || current_date);
  return owed;
end;
$$;
--> statement-breakpoint
revoke execute on function public.remind_debt(uuid, uuid) from public, anon;
--> statement-breakpoint
grant execute on function public.remind_debt(uuid, uuid) to authenticated;

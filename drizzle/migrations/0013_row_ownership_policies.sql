-- 0013 Who may change what inside an account (defects 9, 10, and invitation tokens)
-- Before: any member could edit or delete every booking, expense, settlement and handover,
-- and could read every invitation token. Admin-only documents were protected as rows but
-- their files were readable by any member.

-- Helper used below: the property belongs to the active account.
create or replace function public.in_current_account(_property_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.properties
                 where id = _property_id and account_id = public.current_account_id())
$$;
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_account_role(public.current_account_id(), 'admin')
$$;
grant execute on function public.in_current_account(uuid) to authenticated;
grant execute on function public.is_admin() to authenticated;

-- Bookings: everyone in the account reads and creates; the booker or an admin changes it.
drop policy if exists "Members manage own bookings" on public.bookings;
create policy "Members read bookings" on public.bookings for select to authenticated
  using (public.in_current_account(property_id));
create policy "Members create bookings" on public.bookings for insert to authenticated
  with check (public.in_current_account(property_id)
              and (requester_member_id is null or requester_member_id = public.current_member_id()
                   or public.is_admin()));
create policy "Booker or admin updates booking" on public.bookings for update to authenticated
  using (public.in_current_account(property_id)
         and (requester_member_id = public.current_member_id() or public.is_admin()))
  with check (public.in_current_account(property_id));
create policy "Booker or admin deletes booking" on public.bookings for delete to authenticated
  using (public.in_current_account(property_id)
         and (requester_member_id = public.current_member_id() or public.is_admin()));

-- Tasks: shared work list, anyone updates status; only admins delete.
drop policy if exists "Members manage own tasks" on public.tasks;
create policy "Members read tasks" on public.tasks for select to authenticated
  using (public.in_current_account(property_id));
create policy "Members create tasks" on public.tasks for insert to authenticated
  with check (public.in_current_account(property_id));
create policy "Members update tasks" on public.tasks for update to authenticated
  using (public.in_current_account(property_id)) with check (public.in_current_account(property_id));
create policy "Admins delete tasks" on public.tasks for delete to authenticated
  using (public.in_current_account(property_id) and public.is_admin());

-- Expenses: the payer or an admin edits or deletes.
drop policy if exists "Members manage own expenses" on public.expenses;
create policy "Members read expenses" on public.expenses for select to authenticated
  using (public.in_current_account(property_id));
create policy "Members add expenses" on public.expenses for insert to authenticated
  with check (public.in_current_account(property_id));
create policy "Payer or admin updates expense" on public.expenses for update to authenticated
  using (public.in_current_account(property_id)
         and (paid_by_member_id = public.current_member_id() or public.is_admin()))
  with check (public.in_current_account(property_id));
create policy "Payer or admin deletes expense" on public.expenses for delete to authenticated
  using (public.in_current_account(property_id)
         and (paid_by_member_id = public.current_member_id() or public.is_admin()));

-- Splits: only the person who is owed (the expense payer) or an admin marks them repaid.
drop policy if exists "Members manage own expense splits" on public.expense_splits;
create policy "Members read splits" on public.expense_splits for select to authenticated
  using (exists (select 1 from public.expenses e
                 where e.id = expense_id and public.in_current_account(e.property_id)));
create policy "Members add splits" on public.expense_splits for insert to authenticated
  with check (exists (select 1 from public.expenses e
                      where e.id = expense_id and public.in_current_account(e.property_id)));
create policy "Receiver or admin confirms split" on public.expense_splits for update to authenticated
  using (exists (select 1 from public.expenses e
                 where e.id = expense_id and public.in_current_account(e.property_id)
                   and (e.paid_by_member_id = public.current_member_id() or public.is_admin())))
  with check (exists (select 1 from public.expenses e
                      where e.id = expense_id and public.in_current_account(e.property_id)));
create policy "Receiver or admin deletes split" on public.expense_splits for delete to authenticated
  using (exists (select 1 from public.expenses e
                 where e.id = expense_id and public.in_current_account(e.property_id)
                   and (e.paid_by_member_id = public.current_member_id() or public.is_admin())));

-- Handovers: the author or an admin edits or deletes.
drop policy if exists "Members manage own handovers" on public.handovers;
create policy "Members read handovers" on public.handovers for select to authenticated
  using (public.in_current_account(property_id));
create policy "Members submit handovers" on public.handovers for insert to authenticated
  with check (public.in_current_account(property_id));
create policy "Author or admin updates handover" on public.handovers for update to authenticated
  using (public.in_current_account(property_id)
         and (member_id = public.current_member_id() or public.is_admin()))
  with check (public.in_current_account(property_id));
create policy "Author or admin deletes handover" on public.handovers for delete to authenticated
  using (public.in_current_account(property_id)
         and (member_id = public.current_member_id() or public.is_admin()));

-- Photos: anyone sets the main photo; the uploader or an admin deletes.
drop policy if exists "Members manage own account photos" on public.property_photos;
create policy "Members read photos" on public.property_photos for select to authenticated
  using (public.in_current_account(property_id));
create policy "Members upload photos" on public.property_photos for insert to authenticated
  with check (public.in_current_account(property_id));
create policy "Members set main photo" on public.property_photos for update to authenticated
  using (public.in_current_account(property_id)) with check (public.in_current_account(property_id));
create policy "Uploader or admin deletes photo" on public.property_photos for delete to authenticated
  using (public.in_current_account(property_id)
         and (uploaded_by_member_id = public.current_member_id() or public.is_admin()));

-- Invitation tokens are admin business.
drop policy if exists "Members read own account invitations" on public.invitations;
create policy "Admins read invitations" on public.invitations for select to authenticated
  using (account_id = public.current_account_id() and public.is_admin());

-- Storage: an admin-only document's file is readable by admins only.
-- The check runs as definer because members can't see admin-only document rows themselves.
create or replace function public.is_admin_only_file(_name text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.documents d where d.file_url = _name and d.visibility = 'ADMINS_ONLY')
$$;
revoke execute on function public.is_admin_only_file(text) from public, anon;
grant execute on function public.is_admin_only_file(text) to authenticated;
drop policy if exists "Members read own cottage files" on storage.objects;
create policy "Members read own cottage files" on storage.objects for select to authenticated
  using (
    bucket_id = 'my-chata-files'
    and (storage.foldername(name))[1] in
        (select id::text from public.properties where account_id = public.current_account_id())
    and (
      public.is_admin()
      or not public.is_admin_only_file(name)
    )
  );

-- Anonymous visitors never touch these tables directly; public pages use token functions.
-- (RLS already blocked them; this removes the leftover grants from the first migration.)
revoke all on public.accounts, public.properties, public.members, public.bookings, public.tasks,
  public.expenses, public.expense_splits, public.handovers from anon;

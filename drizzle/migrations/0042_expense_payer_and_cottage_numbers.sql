-- T-059: who an expense is "paid by", and whole positive numbers for cottage facts.
--
-- 1. O-21 (found in the T-057 RLS audit): "Members add expenses" let any member enter an expense
--    paid by someone else, and "Members add splits" let any member add a share to anyone's
--    expense. Either can skew what people owe and the net of an "I paid" claim. Now: the payer is
--    the caller, or the caller is an admin of the account. The same rule applies when an expense
--    is edited (the payer could hand it to someone else) and when a share is added. The app
--    always enters the caller as payer (src/routes/vydaje.tsx), so nothing in it changes.
-- 2. properties.rooms and overlap_max_guests had no check: onboarding saved "-3 rooms" (live test
--    5 Nov 2026) and the cottage page showed it. update_property_details() already refuses
--    them; the columns now do too. Existing bad values are cleared first (they mean "unknown").
--    create_account_onboarding() and add_property() still pass the value through: a bad one now
--    fails on the check (23514), which the app maps to a plain message.
--
-- Safe to run once on a database with data. No function changes.

drop policy if exists "Members add expenses" on public.expenses;
--> statement-breakpoint
create policy "Members add expenses" on public.expenses for insert to authenticated
  with check (public.in_current_account(property_id)
              and (paid_by_member_id = public.current_member_id() or public.is_admin()));
--> statement-breakpoint
drop policy if exists "Payer or admin updates expense" on public.expenses;
--> statement-breakpoint
create policy "Payer or admin updates expense" on public.expenses for update to authenticated
  using (public.in_current_account(property_id)
         and (paid_by_member_id = public.current_member_id() or public.is_admin()))
  with check (public.in_current_account(property_id)
              and (paid_by_member_id = public.current_member_id() or public.is_admin()));
--> statement-breakpoint
drop policy if exists "Members add splits" on public.expense_splits;
--> statement-breakpoint
create policy "Members add splits" on public.expense_splits for insert to authenticated
  with check (exists (select 1 from public.expenses e
                      where e.id = expense_id and public.in_current_account(e.property_id)
                        and (e.paid_by_member_id = public.current_member_id()
                             or public.is_admin())));
--> statement-breakpoint
update public.properties set rooms = null where rooms is not null and (rooms < 1 or rooms > 200);
--> statement-breakpoint
update public.properties set overlap_max_guests = null
  where overlap_max_guests is not null and (overlap_max_guests < 1 or overlap_max_guests > 500);
--> statement-breakpoint
alter table public.properties drop constraint if exists properties_rooms_check;
--> statement-breakpoint
alter table public.properties add constraint properties_rooms_check
  check (rooms is null or rooms between 1 and 200);
--> statement-breakpoint
alter table public.properties drop constraint if exists properties_overlap_max_guests_check;
--> statement-breakpoint
alter table public.properties add constraint properties_overlap_max_guests_check
  check (overlap_max_guests is null or overlap_max_guests between 1 and 500);

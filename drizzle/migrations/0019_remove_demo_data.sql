-- T-012: remove the demo data seeded on 8 Sep 2026 (supabase/migrations/20260908133152_*):
-- the family "Rodina Novákových" (Chata U Lípy) and the fake institution "Vysoká škola podhorní".
-- Decided by the maintainers on 28 Sep 2026.
--
-- Everything inside the two demo accounts goes, including anything real people added there
-- while testing. A copy of those rows stays in schema demo_archive (no API access) so the
-- deletion can be undone; a later migration drops that schema once nobody misses anything.
-- Real people who were linked to a demo member lose only that membership; their own
-- accounts are untouched. Their active account falls back to their oldest remaining one.
--
-- Not covered here: files in storage under the demo property folders
-- b0000000-0000-4000-8000-000000000001/ and b0000000-0000-4000-8000-000000000002/.
-- Safe to re-run: every statement is idempotent.

create schema if not exists demo_archive;
revoke all on schema demo_archive from public;

create table if not exists demo_archive.accounts as
  select * from public.accounts
  where id in ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002');

create table if not exists demo_archive.members as
  select * from public.members
  where account_id in ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002');

create table if not exists demo_archive.properties as
  select * from public.properties
  where account_id in ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002');

create table if not exists demo_archive.bookings as
  select b.* from public.bookings b join public.properties p on p.id = b.property_id
  where p.account_id in ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002');

create table if not exists demo_archive.tasks as
  select t.* from public.tasks t join public.properties p on p.id = t.property_id
  where p.account_id in ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002');

create table if not exists demo_archive.expenses as
  select e.* from public.expenses e join public.properties p on p.id = e.property_id
  where p.account_id in ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002');

create table if not exists demo_archive.expense_splits as
  select s.* from public.expense_splits s
  join public.expenses e on e.id = s.expense_id
  join public.properties p on p.id = e.property_id
  where p.account_id in ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002');

create table if not exists demo_archive.handovers as
  select h.* from public.handovers h join public.properties p on p.id = h.property_id
  where p.account_id in ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002');

create table if not exists demo_archive.institutional_requests as
  select r.* from public.institutional_requests r join public.properties p on p.id = r.property_id
  where p.account_id in ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002');

create table if not exists demo_archive.manual_sections as
  select s.* from public.manual_sections s join public.properties p on p.id = s.property_id
  where p.account_id in ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002');

create table if not exists demo_archive.documents as
  select d.* from public.documents d join public.properties p on p.id = d.property_id
  where p.account_id in ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002');

create table if not exists demo_archive.invitations as
  select * from public.invitations
  where account_id in ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002');

revoke all on all tables in schema demo_archive from public;

-- Four "created by" columns have no ON DELETE rule. Rows OUTSIDE the demo accounts that point
-- at a demo member would block the delete, so clear those pointers first.
update public.properties set created_by_member_id = null
where account_id not in ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002')
  and created_by_member_id in (
    select id from public.members
    where account_id in ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002'));

update public.invitations set created_by_member_id = null
where account_id not in ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002')
  and created_by_member_id in (
    select id from public.members
    where account_id in ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002'));

update public.guest_links g set created_by_member_id = null
where created_by_member_id in (
    select id from public.members
    where account_id in ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002'))
  and not exists (
    select 1 from public.properties p
    where p.id = g.property_id
      and p.account_id in ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002'));

update public.property_photos f set uploaded_by_member_id = null
where uploaded_by_member_id in (
    select id from public.members
    where account_id in ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002'))
  and not exists (
    select 1 from public.properties p
    where p.id = f.property_id
      and p.account_id in ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002'));

-- The delete cascades to properties, members, bookings, tasks, expenses, splits, handovers,
-- manual, documents, photos, invitations and guest links of the two accounts.
-- profiles.member_id and profiles.active_account_id are set to null by their ON DELETE rules.
delete from public.accounts
where id in ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002');

-- Remove the seeded demo data from production (task T-012). Run by a person, not an agent.
-- Part 1 is read-only. Read its output before running part 2.

-- Part 1: who is linked to demo accounts?
select a.name as account, m.name as member, m.email, m.user_id is not null as has_login
from public.accounts a join public.members m on m.account_id = a.id
where a.id in ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002')
order by a.name, m.name;

-- Anything real inside them since the seed (8 Sep 2026)?
select 'bookings' as t, count(*) from public.bookings b join public.properties p on p.id = b.property_id
  where p.account_id in ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002')
  and b.created_at > '2026-09-09'
union all
select 'tasks', count(*) from public.tasks t join public.properties p on p.id = t.property_id
  where p.account_id in ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002')
  and t.created_at > '2026-09-09';

-- Part 2: only if part 1 shows nothing you want to keep. Deletes cascade to properties,
-- members, bookings, tasks, expenses, handovers, manual, documents and photos rows.
-- Storage files under those property ids must be removed separately.
-- begin;
-- delete from public.accounts
--  where id in ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002');
-- select count(*) from public.accounts;   -- check, then:
-- commit;   -- or rollback;

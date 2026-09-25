drop policy if exists "Anyone can log consent" on public.consent_log;

create policy "Users log own or anonymous consent"
on public.consent_log
for insert
to anon, authenticated
with check (user_id is null or user_id = auth.uid());
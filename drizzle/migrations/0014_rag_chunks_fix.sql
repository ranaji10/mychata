-- 0014 House manual search that works and stays inside the account (defects 1, 2; ADR-0004)
-- Before: inserts wrote a `lang` column that did not exist, so no chunk was ever stored;
-- match_manual_chunks was SECURITY DEFINER with no account check and callable by anyone,
-- so once chunks existed any caller could read any property's manual.

create schema if not exists extensions;
create extension if not exists unaccent with schema extensions;

-- unaccent() is not IMMUTABLE, which an index expression needs; this wrapper is the
-- standard workaround (fixed dictionary, so the result never changes).
create or replace function public.f_unaccent(text)
returns text language sql immutable parallel safe strict set search_path = public, extensions as $$
  select extensions.unaccent('extensions.unaccent'::regdictionary, $1)
$$;

drop function if exists public.match_manual_chunks(uuid, vector, int);

-- Chunks were never stored successfully, so the table is rebuilt in place.
delete from public.manual_chunks;
alter table public.manual_chunks
  add column if not exists lang text not null default 'cs' check (lang in ('cs', 'en')),
  add column if not exists visibility text not null default 'MEMBERS_ONLY',
  add column if not exists content_hash text,
  add column if not exists model_version text,
  add column if not exists updated_at timestamptz not null default now();
alter table public.manual_chunks
  add column if not exists tsv tsvector
  generated always as (to_tsvector('simple', public.f_unaccent(content))) stored;

create unique index if not exists manual_chunks_section_lang on public.manual_chunks (section_id, lang);
create index if not exists manual_chunks_property on public.manual_chunks (property_id);
create index if not exists manual_chunks_tsv on public.manual_chunks using gin (tsv);
create index if not exists manual_chunks_embedding on public.manual_chunks
  using hnsw (embedding vector_cosine_ops);

-- Upserts need UPDATE; still admins only, still inside the active account.
grant update on public.manual_chunks to authenticated;
create policy "Admins update chunks" on public.manual_chunks for update to authenticated
  using (public.is_admin() and public.in_current_account(property_id))
  with check (public.is_admin() and public.in_current_account(property_id));

-- Hybrid search: vector similarity and full-text, merged by reciprocal rank fusion.
-- SECURITY INVOKER, so the caller's row-level security decides what can be returned.
create or replace function public.search_manual(
  _property_id uuid, _embedding vector(768), _query text, _lang text default 'cs', _count int default 4
)
returns table (section_id uuid, content text, score float)
language sql stable security invoker set search_path = public, extensions as $$
  with
  vec as (
    select c.section_id, c.content,
           row_number() over (order by c.embedding <=> _embedding) as r
    from public.manual_chunks c
    where c.property_id = _property_id and c.lang = _lang
      and c.embedding is not null and _embedding is not null
    order by c.embedding <=> _embedding
    limit 20
  ),
  txt as (
    select c.section_id, c.content,
           row_number() over (order by ts_rank(c.tsv, q) desc) as r
    from public.manual_chunks c,
         websearch_to_tsquery('simple', public.f_unaccent(coalesce(_query, ''))) q
    where c.property_id = _property_id and c.lang = _lang and c.tsv @@ q
    order by ts_rank(c.tsv, q) desc
    limit 20
  ),
  fused as (
    select section_id, content, 1.0 / (60 + r) as s from vec
    union all
    select section_id, content, 1.0 / (60 + r) as s from txt
  )
  select section_id, min(content), sum(s)::float as score
  from fused
  group by section_id
  order by score desc
  limit least(greatest(_count, 1), 8)
$$;

revoke execute on function public.search_manual(uuid, vector, text, text, int) from public, anon;
grant execute on function public.search_manual(uuid, vector, text, text, int) to authenticated;

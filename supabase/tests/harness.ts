/**
 * Test harness: runs every migration in order on an in-memory Postgres (PGlite)
 * with small shims for the parts of Supabase the migrations rely on
 * (auth.uid(), auth.jwt(), roles anon/authenticated/service_role, storage.objects).
 *
 * Lets CI prove RLS and SECURITY DEFINER behaviour without Docker or a live project.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite-pgvector";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { unaccent } from "@electric-sql/pglite/contrib/unaccent";

const ROOT = join(__dirname, "..", "..");

const SHIMS = `
create extension if not exists pgcrypto;
create schema if not exists extensions;
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
grant usage on schema public to anon, authenticated, service_role;
grant usage on schema extensions to anon, authenticated, service_role;
create schema auth;
grant usage on schema auth to anon, authenticated, service_role;
create table auth.users (id uuid primary key, email text);
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create or replace function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
grant execute on function auth.uid() to anon, authenticated, service_role;
grant execute on function auth.jwt() to anon, authenticated, service_role;
create schema storage;
grant usage on schema storage to anon, authenticated, service_role;
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid);
alter table storage.objects enable row level security;
grant select, insert, update, delete on storage.objects to authenticated;
create or replace function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
grant execute on function storage.foldername(text) to anon, authenticated;
alter default privileges in schema public grant execute on functions to anon, authenticated;
`;

/** Migration files in the order they were applied: Supabase's two, then the drizzle journal. */
export function migrationFiles(): string[] {
  const supa = readdirSync(join(ROOT, "supabase", "migrations"))
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => join(ROOT, "supabase", "migrations", f));
  const journal = JSON.parse(
    readFileSync(join(ROOT, "drizzle", "migrations", "meta", "_journal.json"), "utf8"),
  ) as { entries: { idx: number; tag: string }[] };
  const drizzle = journal.entries
    .sort((a, b) => a.idx - b.idx)
    .map((e) => join(ROOT, "drizzle", "migrations", `${e.tag}.sql`));
  return [...supa, ...drizzle];
}

export async function freshDb(opts: { upTo?: string } = {}) {
  const db = new PGlite({ extensions: { vector, pgcrypto, unaccent } });
  await db.exec(SHIMS);
  for (const file of migrationFiles()) {
    const sql = readFileSync(file, "utf8").replaceAll("--> statement-breakpoint", "");
    try {
      await db.exec(sql);
    } catch (e) {
      throw new Error(`Migration failed: ${file}\n${(e as Error).message}`);
    }
    if (opts.upTo && file.includes(opts.upTo)) break;
  }
  return db;
}

export type Db = PGlite;

/** Run fn as a given role and user, inside a transaction that is always rolled back. */
export async function as<T>(
  db: Db,
  who: { role: "anon" | "authenticated" | "service_role"; userId?: string; email?: string },
  fn: (
    q: <R = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<R[]>,
  ) => Promise<T>,
): Promise<T> {
  await db.exec("begin");
  try {
    const claims = JSON.stringify({
      sub: who.userId ?? "",
      email: who.email ?? "",
      role: who.role,
    });
    await db.query("select set_config('request.jwt.claim.sub', $1, true)", [who.userId ?? ""]);
    await db.query("select set_config('request.jwt.claims', $1, true)", [claims]);
    await db.exec(`set local role ${who.role}`);
    // Each statement runs in a savepoint, so an expected error doesn't abort the test.
    const q = async <R>(sql: string, params?: unknown[]) => {
      await db.exec("savepoint q");
      try {
        const rows = (await db.query<R>(sql, params as never[])).rows;
        await db.exec("release savepoint q");
        return rows;
      } catch (e) {
        await db.exec("rollback to savepoint q");
        throw e;
      }
    };
    return await fn(q);
  } finally {
    await db.exec("rollback");
  }
}

/** Run as the table owner (superuser), committed. For fixtures. */
export async function admin(db: Db, sql: string, params?: unknown[]) {
  return (await db.query(sql, params as never[])).rows;
}

/** Like `as`, but commits. For fixtures that must go through real functions. */
export async function asCommitted<T>(
  db: Db,
  who: { role: "anon" | "authenticated"; userId?: string; email?: string },
  sql: string,
  params?: unknown[],
): Promise<T[]> {
  const claims = JSON.stringify({ sub: who.userId ?? "", email: who.email ?? "", role: who.role });
  await db.exec("begin");
  try {
    await db.query("select set_config('request.jwt.claim.sub', $1, true)", [who.userId ?? ""]);
    await db.query("select set_config('request.jwt.claims', $1, true)", [claims]);
    await db.exec(`set local role ${who.role}`);
    const rows = (await db.query<T>(sql, params as never[])).rows;
    await db.exec("commit");
    return rows;
  } catch (e) {
    await db.exec("rollback");
    throw e;
  }
}

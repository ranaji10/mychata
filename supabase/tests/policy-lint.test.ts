/**
 * Guardrail: fails CI when a migration adds a way for anonymous visitors to reach data,
 * or a SECURITY DEFINER function that doesn't check who is calling. Exceptions live in
 * supabase/security-allowlist.json with a reason and need a human reviewer.
 * (Defects 1, 3 and 4 of 25 Sep 2026 would each have failed this test.)
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, expect, it } from "vitest";
import { admin, freshDb, type Db } from "./harness";

const allow = JSON.parse(
  readFileSync(join(__dirname, "..", "security-allowlist.json"), "utf8"),
) as {
  anonExecutableDefinerFunctions: Record<string, string>;
  definerFunctionsWithoutCallerCheck: Record<string, string>;
  anonTablePrivileges: Record<string, string>;
};
const CALLER_CHECKS = [
  "auth.uid()",
  "current_account_id",
  "current_member_id",
  "has_account_role",
  "in_current_account",
  "is_admin",
  "is_member",
  "has_role",
];

let db: Db;
beforeAll(async () => {
  db = await freshDb();
});

type Fn = { name: string; src: string; anon: boolean };
async function definerFunctions(): Promise<Fn[]> {
  return (await admin(
    db,
    `select p.proname as name, p.prosrc as src, has_function_privilege('anon', p.oid, 'execute') as anon
       from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.prosecdef`,
  )) as Fn[];
}

it("only reviewed SECURITY DEFINER functions are callable by anonymous visitors", async () => {
  const offenders = (await definerFunctions())
    .filter((f) => f.anon && !(f.name in allow.anonExecutableDefinerFunctions))
    .map((f) => f.name);
  expect(offenders, "Revoke execute from public, anon or add a reviewed allowlist entry").toEqual(
    [],
  );
});

it("every SECURITY DEFINER function checks the caller or is a reviewed exception", async () => {
  const offenders = (await definerFunctions())
    .filter((f) => !CALLER_CHECKS.some((c) => f.src.includes(c)))
    .filter((f) => !(f.name in allow.definerFunctionsWithoutCallerCheck))
    .map((f) => f.name);
  expect(offenders, "Add an account/caller check or a reviewed allowlist entry").toEqual([]);
});

it("anonymous visitors have no direct table access beyond the reviewed list", async () => {
  const rows = (await admin(
    db,
    `select c.relname as t, p.priv
       from pg_class c join pg_namespace n on n.oid = c.relnamespace
       cross join (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')) as p(priv)
      where n.nspname = 'public' and c.relkind = 'r'
        and has_table_privilege('anon', c.oid, p.priv)`,
  )) as { t: string; priv: string }[];
  const offenders = rows
    .map((r) => `${r.t}:${r.priv}`)
    .filter((k) => !(k in allow.anonTablePrivileges));
  expect(offenders).toEqual([]);
});

it("every table in public has row-level security switched on", async () => {
  const rows = (await admin(
    db,
    `select c.relname as t from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`,
  )) as { t: string }[];
  expect(rows.map((r) => r.t)).toEqual([]);
});

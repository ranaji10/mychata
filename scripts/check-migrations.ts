/**
 * Migration guard for a repo with more than one person (and Lovable) adding migrations.
 *
 * Fails when:
 *  1. two migration files share a number (two people both made 0019 on their branches),
 *  2. numbers have a gap, or files and meta/_journal.json disagree (a file without an entry
 *     is never applied by Lovable's migrator; an entry without a file breaks it),
 *  3. a migration that already exists on main was edited, renamed or deleted
 *     (applied migrations are history: fix forward with a new file, AGENTS.md invariant 2).
 *
 * Usage: bun scripts/check-migrations.ts [base-ref]   (base defaults to origin/main)
 * No dependencies, so it runs before `bun install` too.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";

const DIR = "drizzle/migrations";
const base = process.argv[2] ?? "origin/main";
const problems: string[] = [];

const files = readdirSync(DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort();

// 1 + 2: unique, contiguous numbers
const byNumber = new Map<number, string[]>();
for (const f of files) {
  const m = /^(\d{4})_/.exec(f);
  if (!m) {
    problems.push(`${f}: name must start with a 4-digit number and an underscore`);
    continue;
  }
  const n = Number(m[1]);
  byNumber.set(n, [...(byNumber.get(n) ?? []), f]);
}
for (const [n, fs] of byNumber) {
  if (fs.length > 1)
    problems.push(
      `number ${String(n).padStart(4, "0")} is used twice: ${fs.join(", ")}. Renumber yours to the next free number.`,
    );
}
const numbers = [...byNumber.keys()].sort((a, b) => a - b);
numbers.forEach((n, i) => {
  if (n !== i)
    problems.push(
      `gap in numbering: expected ${String(i).padStart(4, "0")}, found ${String(n).padStart(4, "0")}`,
    );
});

// 2: journal matches files
const journal = JSON.parse(readFileSync(`${DIR}/meta/_journal.json`, "utf8")) as {
  entries: { idx: number; tag: string }[];
};
const tags = new Set(journal.entries.map((e) => e.tag));
for (const f of files) {
  if (!tags.has(f.replace(/\.sql$/, "")))
    problems.push(`${f} has no entry in meta/_journal.json, so it would never be applied`);
}
for (const e of journal.entries) {
  if (!existsSync(`${DIR}/${e.tag}.sql`))
    problems.push(`meta/_journal.json entry ${e.tag} has no matching .sql file`);
}
journal.entries.forEach((e, i) => {
  if (e.idx !== i)
    problems.push(`meta/_journal.json: entry ${e.tag} has idx ${e.idx}, expected ${i}`);
});

// 3: migrations already on the base branch are never changed
let baseAvailable = true;
try {
  execFileSync("git", ["rev-parse", "--verify", "--quiet", base], { stdio: "ignore" });
} catch {
  baseAvailable = false;
  console.warn(
    `check-migrations: ${base} not available, skipping the "no edits to applied migrations" check`,
  );
}
if (baseAvailable) {
  const diff = execFileSync(
    "git",
    ["diff", "--name-status", "--no-renames", `${base}...HEAD`, "--", `${DIR}/*.sql`],
    { encoding: "utf8" },
  ).trim();
  for (const line of diff ? diff.split("\n") : []) {
    const [status, path] = line.split("\t");
    if (status !== "A")
      problems.push(
        `${path} already exists on ${base} and was ${status === "D" ? "deleted" : "modified"}. Applied migrations are never edited; add a new migration instead.`,
      );
  }
}

if (problems.length) {
  console.error(`check-migrations: ${problems.length} problem(s)\n- ${problems.join("\n- ")}`);
  process.exit(1);
}
console.log(
  `check-migrations: ${files.length} migrations, numbering and journal consistent${baseAvailable ? `, none changed vs ${base}` : ""}`,
);

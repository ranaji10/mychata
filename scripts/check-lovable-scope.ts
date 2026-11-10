/**
 * CI entry point of the Lovable scope check (T-071). Runs on the "lovable-sync -> main" PR.
 *
 * Takes every file this PR changes against main and compares it with `.github/lovable-scope.json`
 * as it stands on the base branch (so Lovable can't widen its own scope); the commits that touched
 * each file are named in the report.
 * Any file outside it fails the job (a flag, not a required check) and is listed in the summary.
 *
 * Usage: bun scripts/check-lovable-scope.ts [base-ref]   (base defaults to origin/main)
 * No dependencies, so it runs before `bun install`.
 */
import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import {
  LOVABLE_AUTHORS,
  outOfScope,
  parseScope,
  report,
  type LovableCommit,
} from "./lovable-scope";

const base = process.argv[2] ?? "origin/main";
const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf8" });

let scopeJson: string | null = null;
try {
  scopeJson = execFileSync("git", ["show", `${base}:.github/lovable-scope.json`], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
} catch {
  scopeJson = null;
}
const scope = parseScope(scopeJson);

// Every file this PR changes against main: what Lovable's branch brings, merges included (a
// merge can carry changes of its own). Main's own changes merged into the branch are not in it.
const changed = git("diff", "--name-only", `${base}...HEAD`).split("\n").filter(Boolean);

// The commits that touched each file, to name them in the report.
const shas = git("log", "--format=%H%x09%an%x09%s", `${base}..HEAD`)
  .split("\n")
  .filter(Boolean)
  .map((line) => line.split("\t"));
const commits: LovableCommit[] = shas.map(([sha, , subject]) => ({
  sha: sha!,
  subject: subject ?? "",
  files: git("diff-tree", "--no-commit-id", "--name-only", "-r", "-m", sha!)
    .split("\n")
    .filter((f) => changed.includes(f)),
}));
// A file only a merge's combined result changed still counts, with no commit named.
const named = new Set(commits.flatMap((c) => c.files));
const orphans = changed.filter((f) => !named.has(f));
if (orphans.length) commits.push({ sha: "(merge)", subject: "", files: orphans });
const lovableCount = shas.filter(([, author]) => LOVABLE_AUTHORS.test(author ?? "")).length;

const findings = outOfScope(commits, scope);
const summary = report(findings, scope, lovableCount);
console.log(summary);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);

for (const f of findings) {
  const kind = f.platform
    ? "Lovable platform file outside the prompt"
    : "Lovable changed a file it was not asked to";
  // An annotation per file, shown on the PR's checks page.
  console.log(
    `::${f.platform ? "warning" : "error"} file=${f.file},title=${kind}::${f.file} (${f.commits.map((s) => s.slice(0, 7)).join(", ")})`,
  );
}
if (findings.length) {
  console.log(
    `\n${findings.length} file(s) outside the scope of ${scope.prompt ?? "any prompt"}. Look at them before merging; then set the next prompt's scope in .github/lovable-scope.json.`,
  );
  process.exit(1);
}

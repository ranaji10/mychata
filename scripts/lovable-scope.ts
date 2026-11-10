/**
 * Which files did Lovable touch that its prompt did not ask for (T-071)?
 *
 * The prompt's scope lives in `.github/lovable-scope.json` on `main`, set by the PR that adds the
 * prompt. The check reads it from the base branch, never from Lovable's branch, so Lovable can't
 * widen its own scope. Pure functions here; the CI entry point is `check-lovable-scope.ts`.
 */

export interface LovableScope {
  /** Prompt the scope belongs to, e.g. "33-L"; null when no prompt is out. */
  prompt: string | null;
  /** Globs of the files the prompt asks Lovable to change (`*` = within a folder, `**` = any depth). */
  allow: string[];
}

export interface LovableCommit {
  sha: string;
  subject: string;
  files: string[];
}

export interface ScopeFinding {
  file: string;
  commits: string[];
  /** Lovable's platform files: accepted by the runbook, but named so they stay apart. */
  platform: boolean;
}

/** Authors Lovable commits as (its bot, or the plain name it used in Sep and Oct). */
export const LOVABLE_AUTHORS = /^(gpt-engineer-app\[bot\]|Lovable)$/;

/** Files Lovable changes on its own (runbook "Lovable platform updates"). Flagged, as platform. */
const PLATFORM = [
  "src/integrations/**",
  "src/routeTree.gen.ts",
  ".lovable/**",
  "package.json",
  "bun.lock",
  "bun.lockb",
];

export function globToRegExp(glob: string): RegExp {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i]!;
    if (c === "*" && glob[i + 1] === "*") {
      // "**/" = any number of folders, "**" at the end = anything below.
      if (glob[i + 2] === "/") {
        re += "(?:.*/)?";
        i += 2;
      } else {
        re += ".*";
        i += 1;
      }
    } else if (c === "*") re += "[^/]*";
    else if (c === "?") re += "[^/]";
    else re += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${re}$`);
}

export function matchesAny(file: string, globs: string[]): boolean {
  return globs.some((g) => globToRegExp(g).test(file));
}

export function parseScope(json: string | null): LovableScope {
  if (!json) return { prompt: null, allow: [] };
  const raw = JSON.parse(json) as Partial<LovableScope>;
  return {
    prompt: typeof raw.prompt === "string" ? raw.prompt : null,
    allow: Array.isArray(raw.allow) ? raw.allow.filter((g) => typeof g === "string") : [],
  };
}

/** Every file Lovable's commits touched outside the scope, platform files marked. */
export function outOfScope(commits: LovableCommit[], scope: LovableScope): ScopeFinding[] {
  const found = new Map<string, ScopeFinding>();
  for (const c of commits) {
    for (const file of c.files) {
      // The scope file itself is never Lovable's to change.
      const allowed = file !== ".github/lovable-scope.json" && matchesAny(file, scope.allow);
      if (allowed) continue;
      const f = found.get(file) ?? { file, commits: [], platform: matchesAny(file, PLATFORM) };
      if (!f.commits.includes(c.sha)) f.commits.push(c.sha);
      found.set(file, f);
    }
  }
  return [...found.values()].sort(
    (a, b) => Number(a.platform) - Number(b.platform) || a.file.localeCompare(b.file),
  );
}

/** Markdown for the job summary. */
export function report(findings: ScopeFinding[], scope: LovableScope, commitCount: number): string {
  const head = scope.prompt
    ? `Lovable scope check for prompt **${scope.prompt}** (${commitCount} commit(s) by Lovable).`
    : `Lovable scope check: no prompt scope is set in \`.github/lovable-scope.json\` on main (${commitCount} commit(s) by Lovable).`;
  if (findings.length === 0) return `${head}\n\nEvery file Lovable changed was asked for.\n`;
  const rows = (list: ScopeFinding[]) =>
    list.map((f) => `| \`${f.file}\` | ${f.commits.map((s) => s.slice(0, 7)).join(", ")} |`);
  const other = findings.filter((f) => !f.platform);
  const platform = findings.filter((f) => f.platform);
  const parts = [head, ""];
  if (other.length)
    parts.push(
      "**Not asked for: review before merging.**",
      "",
      "| File | Commits |",
      "| --- | --- |",
      ...rows(other),
      "",
    );
  if (platform.length)
    parts.push(
      "**Lovable platform files: usually accepted (runbook, Lovable platform updates), named here so they stay apart.**",
      "",
      "| File | Commits |",
      "| --- | --- |",
      ...rows(platform),
      "",
    );
  return parts.join("\n");
}

#!/usr/bin/env bash
# Keeps the branch lovable-sync (Lovable's) and main together. Run by
# .github/workflows/sync-lovable.yml on every push to main or lovable-sync; see its header.
# Needs: git with a remote "origin", and the GitHub CLI `gh` with GH_TOKEN for steps 2 and 3.
# Writes a short report to $GITHUB_STEP_SUMMARY when it is set.
set -euo pipefail

SYNC=lovable-sync
BASE=main
summary="${GITHUB_STEP_SUMMARY:-/dev/null}"
say() { echo "$*" | tee -a "$summary"; }
warn() {
  echo "::warning title=lovable-sync::$*"
  echo "$*" >> "$summary"
}

git fetch --quiet origin "$BASE" "$SYNC"
main=$(git rev-parse "origin/$BASE")
sync=$(git rev-parse "origin/$SYNC")

if [ "$main" = "$sync" ]; then
  say "lovable-sync is already at main (${main:0:7})."
  exit 0
fi

if git merge-base --is-ancestor "$sync" "$main"; then
  git push --quiet origin "$main:refs/heads/$SYNC"
  say "lovable-sync moved from ${sync:0:7} to ${main:0:7}. Lovable picks it up on its next sync."
  exit 0
fi

# lovable-sync holds Lovable commits that are not on main.
ahead=$(git rev-list --count "$main..$sync")
say "lovable-sync has $ahead Lovable commit(s) that are not on main."
pushed=no

# 1. main moved too: merge it into lovable-sync, so Lovable still sees every merge.
if ! git merge-base --is-ancestor "$main" "$sync"; then
  git config user.name "github-actions[bot]"
  git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
  git checkout --quiet --detach "$sync"
  if git merge --quiet --no-edit -m "Merge main into lovable-sync (sync workflow)" "$main"; then
    if git push --quiet origin "HEAD:refs/heads/$SYNC"; then
      pushed=yes
      sync=$(git rev-parse HEAD)
      say "Merged main (${main:0:7}) into lovable-sync: now ${sync:0:7}."
    else
      # Lovable pushed in the meantime; its push starts this workflow again.
      warn "Could not push the merge (lovable-sync moved meanwhile). The next run tries again."
    fi
  else
    git merge --abort || true
    warn "main and lovable-sync conflict, so main was not merged into lovable-sync. Merge the PR from lovable-sync into main by hand (resolve the conflict there)."
  fi
fi

# 2. A PR lovable-sync -> main, so a maintainer only has to merge it.
pr=$(gh pr list --base "$BASE" --head "$SYNC" --state open --json number --jq '.[0].number // empty') || pr=""
created=no
if [ -z "$pr" ]; then
  commits=$(git log --format='- %h %s (%an)' "$main..origin/$SYNC" | head -20)
  files=$(git diff --name-only "$main...origin/$SYNC" | head -40)
  note=""
  if echo "$files" | grep -q '^drizzle/migrations/'; then
    note=$'\n\n**Migrations:** Lovable changed `drizzle/migrations/` (usually an empty marker after applying a migration). Merge this soon: until it is on main, the next migration number is unclear.'
  fi
  body=$(printf '%s\n\n%s\n\n%s\n%s\n\n%s\n%s%s\n\n%s' \
    "Opened by the \"Keep lovable-sync current\" workflow: Lovable pushed commits to \`lovable-sync\` that are not on \`main\` yet." \
    "Merge it when CI is green. Until then this workflow merges every new \`main\` into \`lovable-sync\`, so Lovable keeps getting the other merges." \
    "**Lovable's commits:**" "$commits" \
    "**Files changed against main:**" "$(echo "$files" | sed 's/^/- `/; s/$/`/')" "$note" \
    "Review it like any Lovable batch (\`docs/runbooks/two-person-workflow.md\`).")
  title="Lovable: $(git log -1 --format=%s "origin/$SYNC" | cut -c1-60) ($ahead commit(s))"
  if url=$(gh pr create --base "$BASE" --head "$SYNC" --title "$title" --body "$body" 2>&1); then
    created=yes
    say "Opened $url"
  else
    warn "Could not open the PR from lovable-sync into main: $url. Check Settings -> Actions -> General -> \"Allow GitHub Actions to create and approve pull requests\", or open it by hand."
  fi
else
  say "PR #$pr from lovable-sync into main is already open."
fi

# 3. CI for the PR: nothing this workflow pushes or opens starts CI by itself.
if [ "$pushed" = yes ] || [ "$created" = yes ]; then
  if gh workflow run ci.yml --ref "$SYNC" -f changed_only=true; then
    say "Started CI on lovable-sync (its result shows on the PR)."
  else
    warn "Could not start CI on lovable-sync; run CI by hand (Actions -> CI -> Run workflow, branch lovable-sync, changed files only)."
  fi
fi

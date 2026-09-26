#!/usr/bin/env bash
# Am I working on the latest code, and is anyone else changing the same files?
#
#   bash scripts/sync-check.sh             full report (VS Code runs this when the folder opens)
#   bash scripts/sync-check.sh pre-commit  used by .githooks/pre-commit
#   bash scripts/sync-check.sh pre-push    used by .githooks/pre-push
#
# Only reads git state (after a `git fetch`); never changes your files or branches.
# Skip once: SKIP_SYNC_CHECK=1 git commit ...   Works with the bash 3.2 that ships with macOS.
set -u
MODE="${1:-report}"
[ "${SKIP_SYNC_CHECK:-}" = "1" ] && exit 0

top=$(git rev-parse --show-toplevel 2>/dev/null) || { echo "sync-check: not a git repository"; exit 0; }
cd "$top" || exit 0

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
warns=0
stops=0
say() { printf '%s\n' "$*"; }
warn() { say "  WARN  $*"; warns=$((warns + 1)); }
stop() { say "  STOP  $*"; stops=$((stops + 1)); }
ok() { [ "$MODE" = "report" ] && say "  ok    $*"; return 0; }
indent() { sed 's/^/          /'; }

online=1
if ! git fetch --prune --quiet origin 2>/dev/null; then
  online=0
fi
[ "$MODE" = "report" ] && say "MyChata sync check ($(date '+%d %b %H:%M'))"
[ "$online" = 0 ] && warn "Could not reach GitHub. Results are from your last fetch and may be out of date."

if ! git rev-parse --verify --quiet origin/main >/dev/null; then
  warn "origin/main not found; run: git fetch origin"
  exit 0
fi

branch=$(git rev-parse --abbrev-ref HEAD)
base=$(git merge-base HEAD origin/main)

# Files you are touching: uncommitted, staged, untracked, and committed on this branch.
{
  git diff --name-only
  git diff --name-only --cached
  git ls-files --others --exclude-standard
  git diff --name-only "$base" HEAD
} | sort -u | sed '/^$/d' >"$tmp/mine"

# 1. Your branch
track=$(git for-each-ref --format='%(upstream:track)' "refs/heads/$branch")
case "$track" in
  *gone*) warn "Your branch '$branch' was merged and deleted on GitHub. Start from main: git checkout main && git pull" ;;
esac

behind=$(git rev-list --count HEAD..origin/main)
if [ "$branch" = "main" ]; then
  ahead=$(git rev-list --count origin/main..HEAD)
  if [ "$behind" -gt 0 ]; then
    warn "Your main is $behind commit(s) behind GitHub. Run: git pull"
  else
    ok "main is up to date with GitHub"
  fi
  if [ "$ahead" -gt 0 ]; then
    stop "You have $ahead commit(s) on main that aren't on GitHub. Main only changes through pull requests: git switch -c <your-name>/<task> and push that."
  fi
  if [ "$MODE" = "pre-commit" ]; then
    stop "You're committing directly on main. Create a branch first: git switch -c <your-name>/<task>"
  fi
else
  if [ "$behind" -gt 0 ]; then
    git diff --name-only "$base" origin/main | sort -u >"$tmp/main_changed"
    comm -12 "$tmp/mine" "$tmp/main_changed" >"$tmp/overlap_main"
    if [ -s "$tmp/overlap_main" ]; then
      msg="main has $behind newer commit(s) that change files you're also changing. Bring them in first: git merge origin/main"
      if [ "$MODE" = "pre-push" ]; then stop "$msg"; else warn "$msg"; fi
      indent <"$tmp/overlap_main"
    else
      warn "main has $behind newer commit(s) (none touch your files). Consider: git merge origin/main"
    fi
    if grep -q '^drizzle/migrations/.*\.sql$' "$tmp/main_changed"; then
      warn "New migrations landed on main since you branched. Merge main before adding a migration:"
      grep '^drizzle/migrations/.*\.sql$' "$tmp/main_changed" | indent
    fi
  else
    ok "branch '$branch' includes the latest main"
  fi
fi

# 2. Uncommitted work
n_dirty=$(git status --porcelain | wc -l | tr -d ' ')
if [ "$n_dirty" -gt 0 ] && [ "$MODE" = "report" ]; then
  say "  info  $n_dirty uncommitted file(s) on '$branch'"
fi

# 3. Other people's unmerged branches (open or pending pull requests) touching the same files
my_upstream=$(git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null || true)
: >"$tmp/other_migrations"
found_other=0
git for-each-ref --format='%(refname:short)' refs/remotes/origin >"$tmp/remotes"
while IFS= read -r rb; do
  case "$rb" in origin | origin/HEAD | origin/main) continue ;; esac
  [ "$rb" = "$my_upstream" ] && continue
  [ "$(git rev-list --count "origin/main..$rb")" -eq 0 ] && continue
  rb_base=$(git merge-base origin/main "$rb")
  git diff --name-only "$rb_base" "$rb" | sort -u >"$tmp/theirs"
  grep '^drizzle/migrations/[0-9]\{4\}_.*\.sql$' "$tmp/theirs" >>"$tmp/other_migrations"
  who=$(git log -1 --format='%an, %cr' "$rb")
  comm -12 "$tmp/mine" "$tmp/theirs" >"$tmp/overlap"
  if [ -s "$tmp/overlap" ]; then
    warn "${rb#origin/} ($who) is not merged yet and changes the same files as you. Talk before you both edit them:"
    indent <"$tmp/overlap"
  elif [ "$MODE" = "report" ]; then
    say "  info  unmerged: ${rb#origin/} ($who), $(wc -l <"$tmp/theirs" | tr -d ' ') file(s), no overlap with yours"
  fi
  found_other=1
done <"$tmp/remotes"
[ "$found_other" = 0 ] && ok "no unmerged branches from others"

# 4. Migration numbers: yours must not collide with main or anyone's open branch
my_new=$(git diff --name-only --diff-filter=A "$base" HEAD -- 'drizzle/migrations/*.sql'; git ls-files --others --exclude-standard -- 'drizzle/migrations/*.sql')
{
  git ls-tree --name-only origin/main drizzle/migrations/ | grep '\.sql$'
  cat "$tmp/other_migrations"
} | sed 's#.*/##' | cut -c1-4 | sort -u >"$tmp/taken"
for f in $my_new; do
  num=$(basename "$f" | cut -c1-4)
  if grep -qx "$num" "$tmp/taken"; then
    msg="Your migration $(basename "$f") uses number $num, already taken on main or another open branch. Renumber it."
    if [ "$MODE" = "report" ]; then warn "$msg"; else stop "$msg"; fi
  fi
done
last=$(sort -n "$tmp/taken" | tail -1)
next=$(printf '%04d' $((10#${last:-0} + 1)))
[ "$MODE" = "report" ] && say "  info  next free migration number: $next (claim it in chat before writing it)"

# 5. Lovable activity
lov=$(git log origin/main --since='24 hours ago' --author='gpt-engineer' --oneline | wc -l | tr -d ' ')
[ "$lov" -gt 0 ] && [ "$MODE" = "report" ] && say "  info  Lovable pushed $lov commit(s) to main in the last 24 h"

if [ "$stops" -gt 0 ]; then
  say "sync-check: $stops blocking problem(s). Fix them, or skip once with SKIP_SYNC_CHECK=1."
  exit 1
fi
[ "$MODE" = "report" ] && say "sync-check: $warns warning(s)"
exit 0

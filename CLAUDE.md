@AGENTS.md

## Claude-specific

- Subagents for this repo are in `.claude/agents/` (planner, implementer, reviewer, rls-auditor); skills in `.claude/skills/`.
- Implement in a git worktree per task (`agent/claude/<task-id>`); never on `main`.
- Reviewer and RLS auditor start fresh, without the implementer's context.

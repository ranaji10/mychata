## What and why

<!-- One or two sentences. Link the task brief: docs/tasks/T-xxx.md -->

## Invariants touched (AGENTS.md)

- [ ] 1 Tenancy / RLS - [ ] 2 Migrations - [ ] 3 Branch + PR - [ ] 4 No history rewrite - [ ] 5 Czech-first text

## Verification (commands run and their output, not "tested")

```
bun run check
```

## Reviewer checklist

- [ ] Every new SECURITY DEFINER function checks the caller or has an allowlist entry with a reason
- [ ] New tables have RLS and a test in supabase/tests
- [ ] Every Supabase call handles `error`
- [ ] No secrets, no production data in fixtures
- [ ] docs/STATUS.md updated if behaviour changed
- [ ] Migration read by a human (required for anything in drizzle/migrations)

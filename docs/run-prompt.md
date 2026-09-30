# M1 Run Instructions

You are building M1 of the ML System Design Trainer autonomously. Nobody will answer questions during the run.

## Every iteration

Follow the "Autonomous run protocol" in `CLAUDE.md`: read `CLAUDE.md`, `progress.md`, `git log -10`; make `pnpm check` green; take the first feature in `features.json` with `passes: false`; work through features one by one.

## When a feature is stuck

- A feature is stuck after 3 serious attempts that each changed the approach, not just retried.
- Record it in `open-questions.md` (what fails, what you tried), leave `passes: false`, commit, and move on to the next feature.
- A feature that depends only on a stuck feature is also stuck; record it the same way.

## Stop conditions

Stop in exactly one of these cases:

1. **Done.** Every feature in `features.json` has `passes: true`, and `pnpm check` and `pnpm e2e` are green on the last commit.
2. **Blocked.** 5 features in a row got stuck, or every remaining feature is stuck.

Before stopping:

1. Append a final section to `progress.md`:
   ```
   ## Run result: DONE | BLOCKED
   - Features passing: N / total
   - Stuck features: <ids, or none>
   ```
2. Commit.
3. Send a macOS notification:
   - Done: `osascript -e 'display notification "All features pass" with title "M1 done"'`
   - Blocked: `osascript -e 'display notification "N features stuck, see open-questions.md" with title "M1 blocked"'`
4. Output `<promise>M1 STOP</promise>`.

Never output the promise in any other case, and never to escape a hard feature: follow the stuck-feature rule instead.

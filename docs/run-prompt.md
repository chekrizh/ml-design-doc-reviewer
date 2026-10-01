# M2 Run Instructions

You are building M2 of the ML System Design Trainer autonomously. Nobody will answer questions during the run. M1 and M1.1 are done; their instructions are in git history.

Launch (by the human, in a worktree on `m2/autonomous`):

```
/ralph-loop:ralph-loop "Read docs/run-prompt.md and follow it exactly." --completion-promise "M2 STOP" --max-iterations 80
```

## Every iteration

1. Read `CLAUDE.md`, `progress.md` (the `# M2` part), `git log -10`.
2. **Environment check**, in this order:
   - `docker info` succeeds;
   - if `supabase/config.toml` exists (it appears with `m2-setup-01`): `supabase status` shows the local stack; if not, `supabase start`. Before `m2-setup-01` there is nothing to start; skip this step;
   - `pnpm check` is green; if not, fix it before anything else.

   If Docker or local Supabase does not come up after two attempts (stop, start again), this is an environment failure, not a stuck feature: stop with **BLOCKED: environment** (see Stop conditions). Never mark features stuck because of the environment.
3. Take the first feature in `features.json` with `passes: false` and work through features one by one, in order.

## Sources of truth

When they disagree, the higher one wins and the conflict goes to `open-questions.md`; then continue with work that does not depend on the answer:

1. `docs/acceptance-tests.md` (human-owned, never edit)
2. `docs/backend-spec.md` and `docs/mvp-spec.md` (M2 section)
3. `features.json`
4. `docs/mockups/` (HTML + PNG) and `docs/design-system.md`

Decisions D14–D27 in `docs/decisions.md` are fixed. A new non-trivial choice gets a new entry there; challenging an existing one goes to `open-questions.md`.

## Tests are the bar, not an obstacle

- Mocks reproduce the real API shapes from the official docs (OpenRouter, Google Drive, Google Identity Services). Never invent a simpler format to make code easier.
- Recorded answers R1 and R2 match "Тестовое окружение M2" in `docs/acceptance-tests.md` exactly.
- Tests assert what the user sees. Assert on mock records only where a scenario says so (images sent to the model, Drive requests).
- Never weaken an assertion, widen a tolerance, add a retry or a sleep to make a test pass, or use `skip`, `fixme`, `only`. If a test looks wrong, record it in `open-questions.md` and leave it failing; the feature stays `passes: false`.
- Flaky is failing. Find the cause (await the state, not the time).

## Invariants for every feature

- The full OpenRouter key never reaches the browser, a response body or a log line.
- No secret in `src/`, `dist/`, `config.toml` or a committed `.env*`.
- No Supabase cloud command (login, link, db push, functions deploy, secrets), no request to a real external host from tests.
- RLS and column grants are never loosened to make client code simpler; change the client.
- Guests keep working without Supabase.

## Checks and commits

- **Per feature, before the commit:** `pnpm check`, plus the e2e tests of that feature and of the acceptance scenarios it touches, plus `supabase test db` if the feature touches the database.
- **Every 5 passing M2 features and at the end:** the full `pnpm e2e` (all M1 and M2 tests, Chromium and WebKit for acceptance) and `supabase test db`. A regression found here is fixed before the next feature.
- **UI features:** take a screenshot with the playwright MCP and compare it with the matching PNG in `docs/mockups/`. Differences go to `open-questions.md` as in M1.
- Look up library and API docs before using them: context7 for Supabase, supabase-js, Deno, pgTAP, Playwright, Excalidraw, Vite; the official sites for OpenRouter (openrouter.ai/docs) and Google (developers.google.com).
- When a feature passes: set `passes: true`, append its section to `progress.md` under `# M2` with every step as `- [x]`, commit once with the feature ID first (`m2-db-01: designs table with RLS`). Never touch `main`, never push.

## When a feature is stuck

- Stuck = 3 serious attempts that each changed the approach, not just retried.
- Record it in `open-questions.md` (what fails, what you tried), leave `passes: false`, commit, move on.
- A feature that depends only on a stuck feature is also stuck; record it the same way. The order in `features.json` is the dependency order: setup → backend → auth → designs → library → home and UI → review → export → quality.

## Stop conditions

Stop in exactly one of these cases:

1. **DONE.** Every feature in `features.json` has `passes: true`, and `pnpm check`, `pnpm e2e` and `supabase test db` are green on the last commit.
2. **BLOCKED.** 5 features in a row got stuck, or every remaining feature is stuck.
3. **BLOCKED: environment.** Docker or local Supabase cannot be brought up (see Every iteration, step 2).

Before stopping:

1. Append to `progress.md`:
   ```
   ## Run result: DONE | BLOCKED | BLOCKED: environment
   - Features passing: N / total (M2: n / 39)
   - Stuck features: <ids, or none>
   - Open questions added: <count>
   ```
2. Commit.
3. Send a macOS notification:
   - DONE: `osascript -e 'display notification "All M2 features pass" with title "M2 done"'`
   - BLOCKED: `osascript -e 'display notification "N features stuck, see open-questions.md" with title "M2 blocked"'`
   - BLOCKED: environment: `osascript -e 'display notification "Docker or local Supabase is down" with title "M2 blocked: environment"'`
4. Output `<promise>M2 STOP</promise>`.

Never output the promise in any other case, and never to escape a hard feature: follow the stuck-feature rule instead.

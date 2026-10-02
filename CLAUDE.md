# CLAUDE.md

## Project

ML System Design Trainer: LeetCode for ML System Design. An interactive visual canvas where an engineer builds an ML system architecture block by block, assisted by an AI helper grounded in real system design documents; the result becomes a structured, exportable document. Full vision: `docs/vision.md`. Product requirements (why, who, what): `docs/prd.md`.

## Main philosophy (verbatim, never change or drop)

> Every decision is the result of weighing alternatives, their advantages and disadvantages.
> A system is a collection of decisions made in this way, united by a single goal.
> The goal of the designed system is to solve a business problem within given constraints. Accordingly, the system as a whole and each of its elements are aimed at achieving this goal.

This philosophy is the foundation of the product. Check every feature, UI flow, AI-helper behavior, and document format against it. When the product has to choose how to model a "decision" or a "component", the model must capture the goal, the alternatives considered, and their trade-offs.

Apply the same philosophy to your own engineering decisions in this repo: when making a non-trivial choice, record the goal, the alternatives, and why this one won.

## Scope and stack

- MVP scope and screen specs: `docs/mvp-spec.md`; mockups in `docs/mockups/`.
- UI colors, type and component classes: `docs/design-system.md`. Use only its palette.
- M1 is frontend-only: React + TypeScript + Vite, Excalidraw (React component), TipTap, Zustand, IndexedDB, Tailwind, Vitest + Playwright, pnpm. Deployed as a static build on Vercel.
- M2 adds Supabase (Auth, Postgres + RLS, Vault, Edge Functions) and OpenRouter. Backend contract: `docs/backend-spec.md`. Tests use only local Supabase and mocks; never run Supabase cloud commands.
- Feature list: `features.json` (M1, M1.1, M2). Change only the `passes` field.
- Acceptance scenarios: `docs/acceptance-tests.md`. Human-owned: never edit, weaken, or skip them; implement each as a Playwright test in `e2e/acceptance/`.
- Decision log with alternatives: `docs/decisions.md`. Add an entry for every non-trivial decision.
- Dependencies: only those listed in `docs/decisions.md` plus their obvious tooling (types, test runners, Vite/Tailwind plugins). Any other runtime dependency needs a new entry in `docs/decisions.md` with alternatives, including "no dependency".
- Layout: `src/model` (types and pure rules), `src/store` (Zustand + IndexedDB), `src/canvas`, `src/editor`, `src/document`, `src/export`, `src/fixtures` (Library items), `src/backend` (Supabase client, auth, repositories), `src/review` (review UI state); `supabase/` (migrations, seed, pgTAP tests, edge functions; shared review code in `supabase/functions/_shared/review/`); `e2e/mocks` (OpenRouter mock, Google stubs); `e2e/acceptance` (human scenarios), `e2e/` (agent's own e2e tests). Unit tests sit next to the code as `*.test.ts`.

## Autonomous run protocol

At the start of every session and after every context compaction:

1. Read `CLAUDE.md`, then `progress.md`, then `git log -10`.
2. Run `pnpm check` (once the scaffold exists). If anything is red, fix it before starting new work.
3. Take the first feature in `features.json` with `passes: false`.

For each feature:

- Work on the milestone branch (`m2/autonomous` for M2; run instructions in `docs/run-prompt.md`). Never touch `main`, never push.
- When every step of the feature is verified by a committed, green test, set its `passes` to true and append a section to `progress.md` listing each step as `- [x]`.
- Commit once per feature, only with `pnpm check` green. Message starts with the feature ID, e.g. `canvas-05: inline edit on card`.
- Record non-trivial engineering choices in `docs/decisions.md`.
- Conflicts between spec, features and acceptance scenarios, or differences from mockups, go to `open-questions.md`. Do not resolve them silently; continue with other features.
- Stuck features and stop conditions: `docs/run-prompt.md`.

## Tools during the run

- **context7**: look up the current docs before using any library API (Excalidraw, TipTap, react-grid-layout, Zustand, Tailwind, Vite, Playwright, JSZip). Do not rely on memory for these APIs.
- **playwright MCP**: open the running app to see what a failing test or a UI change actually looks like, and to compare screens with `docs/mockups/`.
- **superpowers**: planning is done (`docs/mvp-spec.md`, `features.json`). Do not use brainstorming, writing-plans or any skill that waits for the human. Use test-driven-development, systematic-debugging and verification-before-completion.
- **ponytail**: prefer the simplest solution, but inside the decisions in `docs/decisions.md`. Those choices are fixed; to challenge one, write to `open-questions.md` instead of switching.
- To read `docs/acceptance-tests.md` use the Read tool; shell commands naming that file are denied.

## Local Supabase (M2)

- Start: `supabase start` (Docker must run). Edge functions in `supabase/functions/` are served by `supabase start`; a function added after start needs `supabase stop && supabase start` (or `supabase functions serve` for hot reload).
- Reset to migrations + seed (test users `test-a@example.test`, `test-b@example.test`, password `test-password`): `supabase db reset`.
- Stop: `supabase stop`.
- Database tests (pgTAP, RLS and grants): `pnpm test:db` (= `supabase test db`).
- `pnpm e2e` fails with "Local Supabase is not running" when the stack is down; each M2 test clears app data through `test_reset()` (seed.sql, local only). Guest-only run with Supabase stopped: `E2E_WITHOUT_SUPABASE=1 pnpm e2e --project chromium --project webkit`.

## Notes

- `README.md` and `CONTRIBUTING.md` still describe the earlier "ML Design Doc Reviewer" idea and are out of date.
- Pre-autonomous-run checklist: `docs/autonomous-run-checklist.md`.

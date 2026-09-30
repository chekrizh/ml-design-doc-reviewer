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
- M1 is frontend-only: React + TypeScript + Vite, Excalidraw (React component), TipTap, Zustand, IndexedDB, Tailwind, Vitest + Playwright, pnpm. Deployed as a static build on Vercel.
- Feature list for M1: `features.json`. Change only the `passes` field.
- Acceptance scenarios: `docs/acceptance-tests.md`. Human-owned: never edit, weaken, or skip them; implement each as a Playwright test in `e2e/acceptance/`.
- Decision log with alternatives: `docs/decisions.md`. Add an entry for every non-trivial decision.

## Autonomous run protocol

At the start of every session and after every context compaction:

1. Read `CLAUDE.md`, then `progress.md`, then `git log -10`.
2. Run `pnpm check` (once the scaffold exists). If anything is red, fix it before starting new work.
3. Take the first feature in `features.json` with `passes: false`.

For each feature:

- Work on branch `m1/autonomous`. Never touch `main`, never push.
- When every step of the feature is verified by a committed, green test, set its `passes` to true and append a section to `progress.md` listing each step as `- [x]`.
- Commit once per feature, only with `pnpm check` green. Message starts with the feature ID, e.g. `canvas-05: inline edit on card`.
- Record non-trivial engineering choices in `docs/decisions.md`.
- Conflicts between spec, features and acceptance scenarios, or differences from mockups, go to `open-questions.md`. Do not resolve them silently; continue with other features.

## Notes

- `data/raw_ByteByteGo_examples/` is not used by the project. Ignore it.
- `README.md` and `CONTRIBUTING.md` still describe the earlier "ML Design Doc Reviewer" idea and are out of date.
- Pre-autonomous-run checklist: `docs/autonomous-run-checklist.md`.

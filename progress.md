# Progress

M1 autonomous run. For every feature from `features.json`, list which of its steps (acceptance criteria) are closed. All steps are expected to be closed before the feature's `passes` is set to true.

Format:

```
## <feature-id>
- [x] <step text>
- [x] <step text>
```

<!-- Entries start below. -->

## setup-01
- [x] `pnpm install` succeeds on a clean checkout with Node 22 (`pnpm install --frozen-lockfile`; `engines.node >=22`)
- [x] `pnpm dev` serves the app and the page renders without console errors (`e2e/build.spec.ts`)
- [x] `pnpm build` produces a static `dist/` (`e2e/build.spec.ts`)

## setup-02
- [x] `pnpm lint`, `pnpm typecheck` and `pnpm test` each run with one command and exit 0
- [x] `pnpm test` runs at least one Vitest test (`src/smoke.test.ts`)
- [x] `pnpm check` runs lint, typecheck, unit tests and build in sequence

## setup-03
- [x] `pnpm e2e` builds or starts the app and runs Playwright in headless Chromium (`playwright.config.ts` webServer)
- [x] A smoke test opens the app and finds the Canvas/Document toggle (`e2e/smoke.spec.ts`)
- [x] Each e2e test starts from an empty IndexedDB (fresh context per test; `e2e/smoke.spec.ts`)

## setup-04
- [x] `pnpm build && pnpm preview` serves a working app (all e2e run against preview)
- [x] The app needs no server-side code or environment variables (`e2e/build.spec.ts`)

## model-01
- [x] Types exist for Design (title, sections, layout, updatedAt) and Section (keyProperties, rationale, tradeoffs, diagram) (`src/model/design.ts`)
- [x] The empty design has exactly 9 sections in canonical order
- [x] Each section has the template keys from the spec table with empty values; Validation has none
- [x] Unit tests cover the factory (`src/model/design.test.ts`)

## model-02
- [x] A pure function returns true only when there are >=2 options, >=1 criterion, every cell is non-empty and exactly one option is chosen (`tradeoffsComplete` in `src/model/rules.ts`)
- [x] Unit tests cover each failing condition separately and the passing case (`src/model/rules.test.ts`)

## model-03
- [x] A pure function returns true when the Excalidraw scene has at least one non-deleted element (`diagramNonEmpty`, added with model-02)
- [x] Unit tests cover an empty scene, a scene with only deleted elements, and a scene with elements

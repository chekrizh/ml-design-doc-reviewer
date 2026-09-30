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

## model-04
- [x] A pure function returns true when all key property values are empty, rationale is empty, the trade-off matrix has no options and the diagram is empty (`sectionEmpty`, added with model-02)
- [x] Unit tests cover each part

## model-05
- [x] Actions exist for title, key properties, rationale, trade-offs, diagram and layout changes (`src/store/store.ts`)
- [x] Unit tests cover each action (`src/store/store.test.ts`)
- [x] Canvas and Document components read and write only through the store (`src/store/architecture.test.ts`; UI in `src/canvas`, `src/document`, `src/editor` uses `useDesign` only)

## persist-01
- [x] Edit a key property value, reload the page: the value is still there (`e2e/persist.spec.ts`)
- [x] Draw on a whiteboard, reload: the drawing is still there
- [x] First visit with empty storage shows the empty design

## persist-02
- [x] A 'Load example' control exists (header)
- [x] Clicking it asks for confirmation because it overwrites the current design (`e2e/persist.spec.ts`)
- [x] Cancel keeps the current design unchanged
- [x] Confirm loads the Churn Prediction (Telecom) example, which fills every section, has complete trade-offs in at least 3 sections and diagrams in at least 2 (`src/fixtures/example.test.ts`, e2e)
- [x] The example lives in one fixture file reused by e2e tests (`src/fixtures/example.ts`)

## canvas-01
- [x] Header shows the design title, the Canvas/Document toggle and export controls (`e2e/canvas.spec.ts`)
- [x] No avatars, Share button or contributor count

## canvas-02
- [x] Clicking the title turns it into an input; Enter saves, Escape cancels (`e2e/canvas.spec.ts`)
- [x] An empty title is shown as 'Untitled design'
- [x] The title persists after reload

## canvas-03
- [x] All 9 cards render with icon and uppercase section name (`e2e/canvas.spec.ts`)
- [x] Initial layout matches docs/mockups/canvas.png: three rows of cards, Target Solution & Architecture spanning full width at the bottom
- [x] Evaluation (Offline) is used instead of Evaluation Strategy

## canvas-04
- [x] A card shows at most the first 4 key properties as key/value pairs (`e2e/canvas.spec.ts`)
- [x] With more than 4, a '+N' counter shows the number of hidden ones
- [x] Empty values show a muted placeholder

## canvas-05
- [x] Clicking a value on a card turns it into an input (`e2e/canvas.spec.ts`)
- [x] Enter or blur saves, Escape cancels
- [x] The new value appears in the Component Editor and the Document

## canvas-06
- [x] A card whose diagram is non-empty shows an SVG thumbnail of it (`e2e/canvas.spec.ts`)
- [x] A card with an empty diagram shows no thumbnail area
- [x] Editing the diagram updates the thumbnail after the editor closes

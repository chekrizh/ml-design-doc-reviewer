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

## canvas-07
- [x] Each card footer shows a Details button and two indicators, Trade-offs and Diagram, which are not clickable (`e2e/canvas.spec.ts`)
- [x] Each indicator has exactly two states: off and bright
- [x] Trade-offs is bright only when the completeness rule (model-02) holds
- [x] Diagram is bright only when the diagram is non-empty (model-03)

## canvas-08
- [x] Cards can be dragged to new positions (`e2e/canvas.spec.ts`)
- [x] The layout persists after reload
- [x] Dragging does not change section content

## canvas-09
- [x] Cards can be resized from a corner handle within sensible min sizes (`e2e/canvas.spec.ts`; min 3 cols x 5 rows)
- [x] The new size persists after reload

## canvas-10
- [x] A 'Reset layout' control restores the initial mockup layout (`e2e/canvas.spec.ts`)
- [x] Section content is unchanged after reset

## editor-01
- [x] Details on a card opens a modal titled with the section name (`e2e/editor.spec.ts`)
- [x] The modal closes with the X button, Escape, and a click outside
- [x] A 'Saved' indicator reflects autosave state ("Saving…" while writing, "Saved to Canvas" after)
- [x] The modal has four parts in order: Decisions & Properties, Rationale & Notes, Trade-off Matrix, Whiteboard

## editor-02
- [x] '+ Add Property' adds an empty key/value row (`e2e/editor.spec.ts`)
- [x] Keys and values are editable, including template keys
- [x] A row can be deleted
- [x] Changes appear on the card immediately

## editor-03
- [x] TipTap editor with bold, italic, inline code, bullet list, ordered list and link (`e2e/editor.spec.ts`)
- [x] Content persists after reload

## editor-04
- [x] The toolbar has an image button that is disabled and shows a 'Coming soon' tooltip (`e2e/editor.spec.ts`)

## editor-05
- [x] 'Add Option (Row)' and 'Add Criteria (Col)' add a row and a column (`e2e/editor.spec.ts`)
- [x] Option names, criterion names and cells are editable
- [x] Rows and columns can be deleted

## editor-06
- [x] Exactly one option can be marked as chosen; marking another moves the mark (`e2e/editor.spec.ts`)
- [x] The chosen option is visually highlighted
- [x] The card's Trade-offs indicator updates live as the matrix changes
- [x] Choosing an option does not change key properties

## editor-07
- [x] The whiteboard is the @excalidraw/excalidraw React component, not an iframe (`e2e/editor.spec.ts`)
- [x] Drawing persists after reload
- [x] The card's Diagram indicator and thumbnail update

## doc-01
- [x] The toggle switches to Document mode and back without losing state (`e2e/document.spec.ts`)
- [x] The document heading is the design title, with 'ML System Architecture Spec' as subtitle and a 'Last updated' line
- [x] Layout matches docs/mockups/document.png: document column and an 'On this page' table of contents on the right

## doc-02
- [x] Sections appear as numbered headings in canonical order (`e2e/document.spec.ts`)
- [x] Reordering cards on the canvas does not change the document order

## doc-03
- [x] Each filled section shows a key properties plate, the rationale, the trade-off matrix as a table with the chosen option marked, and the diagram as an image (`e2e/document.spec.ts`)
- [x] Parts that are empty inside a filled section are omitted

## doc-04
- [x] An empty section (model-04) shows its heading and a 'Not filled yet' placeholder (`e2e/document.spec.ts`)

## doc-05
- [x] 'On this page' lists all 9 sections (`e2e/document.spec.ts`)
- [x] Clicking an entry scrolls to the section
- [x] The entry of the section in view is highlighted

## doc-06
- [x] Clicking a value on the key properties plate makes it editable (`e2e/document.spec.ts`)
- [x] After saving, the canvas card shows the new value

## doc-07
- [x] The rationale is editable in place with the same TipTap editor (`e2e/document.spec.ts`)
- [x] After editing, the Component Editor shows the same content

## doc-08
- [x] Cells, option names and the chosen mark are editable in place (`e2e/document.spec.ts`)
- [x] Changes appear in the Component Editor and update the card indicator

## sync-01
- [x] An edit in Canvas mode is visible in Document mode right after switching, without reload (`e2e/document.spec.ts`)
- [x] An edit in Document mode is visible in Canvas mode right after switching, without reload
- [x] Covered for key properties, rationale, trade-offs and diagram

## export-01
- [x] A pure function turns a Design into Markdown: title, subtitle, numbered section headings, key properties table, rationale as Markdown, trade-off matrix as a table with the chosen option marked, diagram image links to images/<section-id>.svg (`src/export/markdown.ts`, `src/export/markdown.test.ts`)
- [x] Empty sections are excluded
- [x] A snapshot test runs on the example fixture

## export-02
- [x] With no non-empty diagrams, 'Export Markdown' downloads a single `<title-slug>.md` (`e2e/export.spec.ts`)
- [x] The file content equals the generator output

## export-03
- [x] With at least one non-empty diagram, 'Export Markdown' downloads `<title-slug>.zip` (`e2e/export.spec.ts`)
- [x] The ZIP contains `<title-slug>.md` and `images/*.svg`, one per non-empty diagram
- [x] Every image link in the Markdown resolves to a file in the ZIP

## export-04
- [x] 'Export PDF' opens the browser print dialog for the document (`e2e/export.spec.ts`, `window.print` stubbed)
- [x] Print styles show only the document: no header, toggle or table of contents
- [x] `page.pdf()` in Playwright produces a PDF that contains every filled section heading

## export-05
- [x] If any section is empty, both exports first show a warning with the number of empty sections (`e2e/export.spec.ts`)
- [x] The user can continue or cancel
- [x] With no empty sections there is no warning

## ui-01
- [x] Below 1280px viewport width the app shows an 'Open on desktop' screen instead of the editor (`e2e/ui.spec.ts`)
- [x] At 1280px and above the app works normally

## ui-02
- [x] An e2e test saves screenshots of the canvas, the Component Editor and the document with the example loaded to `e2e/screenshots/` (`e2e/ui.spec.ts`)
- [x] Each screenshot is compared by eye with the matching file in docs/mockups/ and differences are noted in open-questions.md

## acceptance-01
- [x] Each scenario AT-01..AT-14 has its own Playwright test in e2e/acceptance/ whose name starts with the scenario ID (`at-01-08.spec.ts`, `at-09-14.spec.ts`)
- [x] Each test checks every 'Ожидаем' item of its scenario literally
- [x] No acceptance test is skipped or marked fixme
- [x] All acceptance tests pass (also 5x repeated run of the whole suite: 290/290)

## final-01
- [x] `pnpm check` and `pnpm e2e` (including e2e/acceptance/) pass on a clean checkout (fresh `node_modules`, `pnpm install --frozen-lockfile`: 36 unit tests, 58 e2e tests green)
- [x] No TODOs left for features marked as passing (no TODO/FIXME/skip/fixme/only in `src` or `e2e`)

## Run result: DONE
- Features passing: 46 / 46
- Stuck features: none

# M1.1

## m11-01
- [x] Cards have no Diagram indicator; a non-empty diagram is shown only by its thumbnail (`e2e/canvas.spec.ts` canvas-07, `e2e/acceptance/at-01-08.spec.ts` AT-05)
- [x] diagramNonEmpty (model-03) is still used for thumbnails, the document and export (`src/model/rules.test.ts`, AT-05, AT-12)

## m11-02
- [x] A scales icon sits in the top-right corner of every card header; it is a status, not a button, and has no click action (`e2e/canvas.spec.ts` m11-02)
- [x] Off: grey scales. On: green scales with a check mark
- [x] Hover or keyboard focus shows the off/on tooltip
- [x] The icon keeps an accessible name and a data-state of 'on'/'off'

## m11-03
- [x] Details is the only control in the card footer and is aligned to the right edge (`e2e/canvas.spec.ts` m11-03)

## m11-04
- [x] Card height is computed from its content (key properties, +N, thumbnail); the user changes only width and order (`e2e/canvas.spec.ts` m11-04, `src/canvas/flow.test.ts`)
- [x] The resize handle changes width only (canvas-09, m11-04)
- [x] When content grows or shrinks, the card height follows and cards below move (m11-04)
- [x] Reset layout restores the mockup order and widths (canvas-10, AT-10)
- [x] Approach recorded in docs/decisions.md (D9)

## m11-05
- [x] Side gaps reproduced (windows wider than 1600px: canvas capped at `max-w-[1600px]` under a full-width header) and fixed at the root; engine geometry is identical in Chromium and WebKit (`e2e/layout.spec.ts`, runs in both; note in open-questions.md)
- [x] WebKit project in playwright.config.ts runs e2e/acceptance/ (plus layout.spec.ts); Chromium runs the whole suite
- [x] WebKit browser installed (`pnpm exec playwright install webkit`)

## m11-06
- [x] Left: logo, editable title, small save status next to the title (`e2e/canvas.spec.ts` canvas-01 / m11-06)
- [x] Center: Canvas/Document toggle
- [x] Right: AI Review, Share and '⋯' (More) buttons
- [x] Share popover with Export PDF and Export Markdown; both keep the empty-sections warning (m11-06, export.spec.ts, AT-01/12/13)
- [x] '⋯' menu with Load example (confirmation) and Reset layout (canvas mode only)
- [x] Popovers close on outside click and Escape

## m11-07
- [x] AI Review opens a popover with one item, 'Full review' (`e2e/canvas.spec.ts` m11-07)
- [x] 'Full review' is disabled and shows a 'Coming soon' tooltip; wiring to a skill is M2

## m11-08
- [x] Every section in Document mode has an editable rationale area, including empty sections (`e2e/document.spec.ts` doc-04 / m11-08)
- [x] An empty section shows 'Not filled yet — start typing…' inside that area (filled sections with no text show 'Add rationale & notes…')
- [x] Typing there fills the section's Rationale & Notes, visible in the Component Editor (m11-08)
- [x] Empty placeholders are not printed and not exported (m11-08, doc-03)

## m11-09
- [x] Clicking the document heading makes it editable inline; saving changes the design title in the header and the export file name, and persists (`e2e/document.spec.ts` m11-09)

## m11-10
- [x] Target Solution & Architecture: target (bullseye) icon (`e2e/canvas.spec.ts` m11-10)
- [x] Baseline: anchor icon
- [x] Evaluation (Online): flask icon
- [x] Problem Space: flag icon
- [x] Scales are used only by the trade-offs status icon, never as a section icon

## acceptance-02
- [x] Each new scenario AT-15..AT-20 has its own Playwright test in e2e/acceptance/ whose name starts with the scenario ID (`at-15-20.spec.ts`)
- [x] Updated scenarios' tests match the current text: AT-01 (export through Share), AT-04 (grey vs. green scales with a check mark), AT-05 (thumbnail only, no Diagram indicator), AT-09 (thumbnail; the resized size is the width), AT-11 (thumbnails), AT-14 (no Share / AI Review in the PDF; WebKit note in open-questions.md)
- [x] All acceptance tests pass in Chromium and WebKit (also 3x repeated: 120/120)

## final-01 (M1.1)
- [x] `pnpm check` and `pnpm e2e` (Chromium full suite + WebKit acceptance) pass on a clean checkout (`pnpm install --frozen-lockfile`: 42 unit tests, 106 e2e tests green)
- [x] No TODOs left for features marked as passing (no TODO/FIXME/skip/fixme/only in `src` or `e2e`)

## Run result: DONE
- Features passing: 57 / 57
- Stuck features: none

# M2

## m2-setup-01
- [x] `supabase init` config is committed; `supabase start` and `supabase db reset` succeed on a clean checkout (seed: test users, sign-ups closed, password sign-in on; `e2e/m2/supabase.spec.ts`)
- [x] `pnpm e2e` checks that local Supabase is running and fails with "Local Supabase is not running: run `supabase start`" if not (`e2e/global-setup.ts`); every M2 test resets the database via `test_reset()` (`e2e/m2/fixtures.ts`, D28)
- [x] CLAUDE.md lists the commands to start, reset and stop local Supabase

## m2-setup-02
- [x] `@supabase/supabase-js` added with D29 in docs/decisions.md (alternatives include no dependency); lazy client in `src/backend/supabase.ts` (`supabase.test.ts`)
- [x] `.env.example` names `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_GOOGLE_CLIENT_ID`, `VITE_TEST_SIGNIN`; local values point to local Supabase (e2e build gets the same via playwright.config.ts)
- [x] With Supabase stopped, all M1 and M1.1 acceptance tests pass in Chromium and WebKit (`E2E_WITHOUT_SUPABASE=1 pnpm exec playwright test e2e/acceptance --project=chromium --project=webkit`: 42/42)

## m2-setup-03
- [x] OpenRouter mock (`e2e/mocks/openrouter/server.ts`, started by global setup on 127.0.0.1:4010, reachable from edge functions via `host.docker.internal`): /key accepts only `sk-or-v1-test-valid-0000a3f9`, /models, /chat/completions with R1, R2, 401, 402, 429, bad_output, no_images and a delay; records the last request without Authorization (`e2e/m2/mocks.spec.ts`)
- [x] Google stubs via page.route (`e2e/mocks/google/google.ts`): GIS script with grant / deny / popup-blocked / popup-closed, Drive upload that records create vs update and can fail (500, or 401 once)
- [x] The M2 Playwright fixture fails the test on any request to a non-local host that is not stubbed (`e2e/m2/fixtures.ts`)

## m2-db-01
- [x] Migration creates `designs` as §3.1, with the version trigger: only `data`/`title` changes bump `version` and `updated_at` (`supabase/tests/designs.test.sql`)
- [x] RLS and grants as §4 (anon nothing; authenticated only own rows; `version`, `user_id` not updatable by the client); pgTAP proves a user cannot read, update or delete another user's designs (`pnpm test:db`)
- [x] Insert and update store and return the same JSON the client sent (pgTAP and `e2e/m2/db.spec.ts` through supabase-js)

## m2-db-02
- [x] Migration creates `review_runs`, `findings` and the view `design_open_findings` (security_invoker) as §3.2–3.5 (`supabase/tests/reviews.test.sql`)
- [x] `svc_complete_review_run` replaces findings in the run's scope in one transaction (row lock on the run) and keeps the replaced ones with `replaced_by_run_id`; a section run leaves whole-design findings; a canceled run changes nothing (pgTAP)
- [x] Clients can change only `findings.status`/`status_changed_at` and cancel their own running run; pgTAP proves inserts, other updates and `svc_*` calls are refused

## m2-db-03
- [x] `user_settings` and the `svc_*` key functions as §3.4 and §4.1; the key lives in Vault (`vault.create_secret` / `update_secret`), `user_settings` holds only the secret id and last 4 (`supabase/tests/settings.test.sql`)
- [x] `authenticated` can neither select `key_secret_id` nor execute any `svc_*` function nor read Vault (pgTAP)
- [x] Only the edge functions read the key: `svc_get_openrouter_key` is executable by `service_role` only (pgTAP)

## m2-auth-01
- [x] 'Sign in with Google' starts Supabase Google OAuth (PKCE, redirect back to the current URL); after sign-in the header shows the Google photo and the account menu (`e2e/m2/auth.spec.ts`)
- [x] The test sign-in ('Sign in as test user', seed users) exists only with `VITE_TEST_SIGNIN=true`; the gate and the button live in one module (`src/backend/TestSignIn.tsx`) so a production build drops them; a test builds without the flag and checks the bundle has no button text, password or test emails
- [x] Sign out returns to the guest home screen

## m2-auth-02
- [x] On sign-in (and on load with a session, which retries a failed move) the local design is imported as a new cloud design with `client_id = meta.id` (`on conflict do nothing`, so a repeat never duplicates); existing cloud designs are untouched (`e2e/m2/auth-import.spec.ts`)
- [x] IndexedDB is cleared after a successful import; a failed import keeps the local design
- [x] An empty local design (no title, no filled section) is not imported (`designHasContent`, `src/model/summary.test.ts`)

## m2-designs-01
- [x] Edits on `/d/:id` autosave to Supabase (800 ms debounce, `update … where version = :seen`); the header save status works as in M1: Saving / Saved / Not saved (`e2e/m2/cloud.spec.ts`)
- [x] Reload restores title, values, rationale, matrices, diagrams and layout; opening a design does not write it
- [x] Guests keep the M1 IndexedDB autosave on `/local` (M1 persist tests); local and cloud autosave share `autosave()` in `src/store/persist.ts`

## m2-setup-04
- [x] Routes `/`, `/d/:id`, `/local`, `/library/:itemId` on the History API without a dependency (`src/router.ts`, D27); back/forward works; unknown paths go home (`e2e/m2/routes.spec.ts`, `src/router.test.ts`); `vercel.json` rewrites deep links to the SPA
- [x] Reloading a design URL opens the same design: the cloud one for its signed-in owner (`e2e/m2/cloud.spec.ts`), the local one for guests (`e2e/m2/routes.spec.ts`); others are sent home

## m2-designs-02
- [x] Saves use `update … where version = :seen` (D23); zero updated rows is a conflict (`src/backend/cloud.ts`, pgTAP in designs.test.sql)
- [x] The tab shows a banner that the design changed elsewhere, with Reload; autosave of that design stops until reload (`e2e/m2/conflict.spec.ts`)
- [x] After reload the tab shows the stored version, and autosave works again
- [x] Opening a design writes nothing: measured card heights are not edits (D30), so a second tab does not bump the version

## m2-lib-01
- [x] `src/fixtures` holds Supermegaretail Demand Forecasting (example) and SuperPay Real-Time Fraud Detection (task), each with Source, parsed from `docs/library/*.md` (D31: `library-parse.ts`, `library.ts`)
- [x] A unit test checks every key property, rationale text, trade-off matrix and chosen option against the markdown files line by line (`src/fixtures/library.test.ts`)
- [x] The task has only Problem Space filled and an empty ML Task value
- [x] Load example loads Supermegaretail (`exampleDesign`); my M1 tests that expected Churn are updated (helpers, canvas-12, persist-02, doc-03, doc-08, export-03, ui-02, AT-11 point 2 per 'Что из M1 заменено', markdown snapshot)

## m2-lib-02
- [x] Validation, Data & Features and Integration have Excalidraw diagrams built from the descriptions in the markdown (`src/fixtures/diagram.ts`: rows of [boxes] joined by arrows, row labels, wrapped labels); a unit test checks every box, arrow and fold label against the file (`library.test.ts`)
- [x] Exactly these 3 cards show a thumbnail after Load example; Target Solution keeps the default diagram per M1.1 (`e2e/m2/library.spec.ts`, persist-02)

## m2-designs-03
- [x] New design and Start task create a cloud design at once; the first edit of an example creates one too (`e2e/m2/home.spec.ts`)
- [x] Opening a design from 'Your designs' loads it; Delete asks with the M1 dialog (Cancel keeps) and removes it for good, findings included (cascade)
- [x] No folders, search or rename from the list (only Delete in '⋯')

## m2-home-01
- [x] 'Design a system' and 'Examples' share one row, each a horizontal strip of cards; 'Your designs' fills the rest of the height and scrolls inside (`e2e/m2/home.spec.ts`, 14 designs)
- [x] At 1440×900 the page itself does not scroll
- [x] Matches docs/mockups/home-signed-in.png and home-guest.png (compared with playwright MCP screenshots; differences: the Source line reads 'Source: ML System Design · MIT')

## m2-home-02
- [x] Each card: Problem Space preview (Domain, Goal, Constraints, ML Task), title, one sentence, chip Blank / Task / Example, action button
- [x] The task's ML Task reads 'Your first decision'; the example shows its Source (link to the original)
- [x] New design, Start task and Open example open the matching design (guest in `/local`, signed-in in `/d/:id` or `/library/:itemId`)

## m2-home-03
- [x] Row: 3×3 section map in canvas layout (filled / empty), title, origin chip, ML Task, 'N / 9 sections', trade-offs count, open findings (from `design_open_findings`), last edit date (`src/home/edited.ts` + unit test), '⋯' with Delete
- [x] Last edited first
- [x] Empty state when there are no designs

## m2-home-04
- [x] 'Your designs' is inactive for guests with 'Sign in to keep several designs and run AI review' and Sign in with Google
- [x] With a local design, 'Current work · in this browser' shows it with Continue
- [x] Opening an example or task over a local design asks 'Replace your current work?' with the M1 dialog (title added to `confirmDialog`); Cancel keeps it

## m2-home-05
- [x] Opening an example without editing creates nothing (`/library/:itemId`)
- [x] The first edit saves a copy with origin Example to 'Your designs' and moves the URL to `/d/:id` without remounting the editor; the library example stays unchanged

## m2-doc-01
- [x] The outline is left of the sheet, styled as in M1; the comments column is right of the sheet, always, with or without a review (`e2e/m2/document.spec.ts`; doc-01 updated: superseded TOC position)
- [x] Matches the column layout of docs/mockups/review-document.png (playwright MCP screenshot; the comments themselves come with m2-review-10)

## m2-ui-01
- [x] One toast at a time, bottom center, role=status, classes from docs/design-system.md (`src/ui/toast.tsx`, `e2e/m2/toast.spec.ts`)
- [x] Success, error and progress variants; actions and a dismiss button (used for moving the guest design on sign-in: progress → error with Try again → success)

## m2-review-01
- [x] Types and pure rules in `supabase/functions/_shared/review/` (`types.ts`, `anchors.ts`: field texts §5.6) and `src/model/review.ts`, imported by the app through the `@review` alias (D24), with unit tests (`anchors.test.ts`, `src/model/review.test.ts`)
- [x] Review indicator per section (not reviewed / red / green), worst severity, counts by severity, groups with 'Whole design' first
- [x] Stale is derived (D25): field text differs from `anchor_value` → 'Field changed since review'; field not found → whole design, 'Field removed'

## m2-review-02
- [x] `pnpm gen:skill` (`scripts/gen-skill.ts`) builds `supabase/functions/_shared/skill.generated.ts` from vendor (SKILL.md + references, rubric dimensions); a unit test fails if it is out of date (`skill.test.ts`)
- [x] Serializer output for the example matches a committed snapshot (§6.7, `review/__snapshots__/example-design.txt`); anchor resolution follows the §6.8 table; a section run keeps only its section, at most 40 findings (`review/review.test.ts`)
- [x] Request built for the example has the instruction, the skill with cache_control, the design text and exactly 3 PNG images after it (§6.4 step 6; `src/review/request.ts`, `review/prompt.ts`); model answers are validated against the strict schema (§6.5); provider errors map to §6.4 codes (`review/errors.ts`)

## m2-review-03
- [x] `review` follows §6.4 step by step: auth, ownership (RLS), key, limits (one running run, stale runs time out, 20 per hour, payload size), run row with snapshot, OpenRouter call with a 120 s timeout (`supabase/functions/review/index.ts`, `e2e/m2/review-fn.spec.ts`)
- [x] Every row of the §6.4 error table returns its code and status (mock scenarios 401, 402, 429, no_images, 408, 500, bad_output); after a failure the run is `failed` with that code
- [x] A canceled run's results are discarded (`svc_complete_review_run` returns `canceled` → 409), previous findings stay
- [x] Logs contain no headers, bodies or keys: unit test of `logLine` and an e2e test that reads the edge runtime's docker logs after a review; CORS origin filtering is unit-tested (`cors.test.ts`) because the local gateway rewrites CORS headers; Supabase is reached with fetch (D32)

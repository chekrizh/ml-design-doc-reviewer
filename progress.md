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

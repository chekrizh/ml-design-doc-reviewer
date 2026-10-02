import { defineConfig, devices } from '@playwright/test'

// Every test gets a fresh browser context, so IndexedDB starts empty.
// M2 tests share one local Supabase, so they run one at a time: one worker per M2 project,
// and the WebKit M2 project waits for the Chromium one.
const chrome = { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } }
const safari = { ...devices['Desktop Safari'], viewport: { width: 1440, height: 900 } }
const M2 = ['m2/**/*.spec.ts', 'acceptance/m2/**/*.spec.ts']

export default defineConfig({
  testDir: 'e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173',
    viewport: { width: 1440, height: 900 },
    acceptDownloads: true,
  },
  projects: [
    { name: 'chromium', testIgnore: M2, use: chrome },
    // Safari engine: the acceptance scenarios plus the canvas layout check.
    { name: 'webkit', testMatch: ['acceptance/**/*.spec.ts', 'layout.spec.ts', 'csp.spec.ts'], testIgnore: M2, use: safari },
    { name: 'm2-chromium', testMatch: M2, workers: 1, use: chrome },
    { name: 'm2-webkit', testMatch: 'acceptance/m2/**/*.spec.ts', workers: 1, dependencies: ['m2-chromium'], use: safari },
  ],
  webServer: {
    command: 'pnpm build && pnpm preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: false,
    timeout: 120_000,
    // Local Supabase and its CLI-default publishable key (not a secret); the test sign-in is on.
    env: {
      VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH',
      VITE_GOOGLE_CLIENT_ID: 'test-client-id.apps.googleusercontent.com',
      VITE_TEST_SIGNIN: 'true',
    },
  },
})

import { defineConfig } from 'vitest/config'
import { alias } from './vite.config'

export default defineConfig({
  resolve: { alias },
  test: { include: ['src/**/*.test.{ts,tsx}', 'supabase/functions/_shared/**/*.test.ts', 'scripts/**/*.test.ts'] },
})

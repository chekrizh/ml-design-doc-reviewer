import { afterEach, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

it('is null without Supabase settings, so the guest app runs without a backend', async () => {
  vi.stubEnv('VITE_SUPABASE_URL', '')
  vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', '')
  const { getSupabase } = await import('./supabase')
  expect(getSupabase()).toBeNull()
})

it('creates one client lazily when configured', async () => {
  vi.stubEnv('VITE_SUPABASE_URL', 'http://127.0.0.1:54321')
  vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test')
  const { getSupabase } = await import('./supabase')
  const c = getSupabase()
  expect(c).not.toBeNull()
  expect(getSupabase()).toBe(c)
})

import { execFileSync } from 'node:child_process'

export const SUPABASE_URL = process.env.E2E_SUPABASE_URL ?? 'http://127.0.0.1:54321'

/**
 * M2 tests need local Supabase. Its keys are read from `supabase status`
 * (local defaults, never production) and passed to the workers via process.env.
 * Also starts the OpenRouter mock for the whole run.
 * E2E_WITHOUT_SUPABASE=1 skips the check: guest-only runs with Supabase stopped.
 */
export default async function globalSetup() {
  if (process.env.E2E_WITHOUT_SUPABASE === '1') return
  const ok = await fetch(`${SUPABASE_URL}/auth/v1/health`).then((r) => r.ok, () => false)
  if (!ok) throw new Error('Local Supabase is not running: run `supabase start`')
  const env = execFileSync('supabase', ['status', '-o', 'env'], { encoding: 'utf8' })
  for (const m of env.matchAll(/^(PUBLISHABLE_KEY|SECRET_KEY)="(.*)"$/gm)) process.env[`SUPABASE_${m[1]}`] = m[2]
  // Edge functions reach it through OPENROUTER_BASE_URL in supabase/config.toml.
  const { startOpenRouterMock } = await import('./mocks/openrouter/server')
  const mock = await startOpenRouterMock()
  return () => new Promise<void>((resolve) => mock.close(() => resolve()))
}

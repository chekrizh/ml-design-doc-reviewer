import { test as base } from '@playwright/test'
import { SUPABASE_URL } from '../global-setup'
import { mockOpenRouter } from '../mocks/openrouter/server'

/** Service-role call to local Supabase REST (the key comes from global-setup). */
export async function serviceRpc(fn: string, body: object = {}) {
  const key = process.env.SUPABASE_SECRET_KEY!
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`${fn}: ${res.status} ${await res.text()}`)
  return res.status === 204 ? null : res.json()
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1'])

export const test = base.extend<{ cleanDb: void; externalRequests: string[] }>({
  /** Every M2 test starts from a known state: seed users only, no app data, no Vault keys, mock answers R1. */
  // eslint-disable-next-line no-empty-pattern -- Playwright requires the fixtures object pattern
  cleanDb: [async ({}, use) => {
    await serviceRpc('test_reset')
    await mockOpenRouter.scenario('R1')
    await use()
  }, { auto: true }],

  /**
   * Fails the test on any request to a non-local host. Stubs (page.route in e2e/mocks/google)
   * take precedence over this context-level catch-all, so stubbed Google URLs never reach it.
   */
  externalRequests: [async ({ context }, use) => {
    const seen: string[] = []
    await context.route(/^https?:\/\//, (route) => {
      const url = new URL(route.request().url())
      if (LOCAL_HOSTS.has(url.hostname)) return route.fallback()
      seen.push(url.href)
      return route.abort('blockedbyclient')
    })
    await use(seen)
    if (seen.length) throw new Error(`Request to a real external host: ${seen.join(', ')}`)
  }, { auto: true }],
})

export { expect } from '@playwright/test'

/** A supabase-js client signed in as a seed test user, as the app would be (RLS applies). */
export async function signedInClient(email: 'test-a@example.test' | 'test-b@example.test' = 'test-a@example.test') {
  const { createClient } = await import('@supabase/supabase-js')
  const client = createClient(SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } })
  const { error } = await client.auth.signInWithPassword({ email, password: 'test-password' })
  if (error) throw error
  return client
}

import { test as base } from '@playwright/test'
import { SUPABASE_URL } from '../global-setup'

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

/** Every M2 test starts from a known database: seed users only, no app data, no Vault keys. */
export const test = base.extend<{ cleanDb: void }>({
  // eslint-disable-next-line no-empty-pattern -- Playwright requires the fixtures object pattern
  cleanDb: [async ({}, use) => {
    await serviceRpc('test_reset')
    await use()
  }, { auto: true }],
})

export { expect } from '@playwright/test'

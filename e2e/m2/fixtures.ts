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

/** Everything the app keeps in IndexedDB, by key ('current' design, 'meta'). */
export const localStore = (page: import('@playwright/test').Page) =>
  page.evaluate(
    () =>
      new Promise<Record<string, unknown>>((resolve) => {
        const req = indexedDB.open('ml-design-trainer')
        req.onsuccess = () => {
          const s = req.result.transaction('designs').objectStore('designs')
          const out: Record<string, unknown> = {}
          const cur = s.openCursor()
          cur.onsuccess = () => {
            const c = cur.result
            if (!c) return resolve(out)
            out[String(c.key)] = c.value
            c.continue()
          }
        }
      }),
  )

export const signInAsTestUser = async (page: import('@playwright/test').Page) => {
  await page.getByRole('button', { name: 'Sign in as test user' }).click()
  await page.getByRole('img', { name: 'Google profile photo' }).waitFor()
}

/** Inserts a cloud design for a test user through REST, as the app would; returns its id. */
export async function createCloudDesign(title: string, opts: { origin?: 'blank' | 'task' | 'example'; email?: 'test-a@example.test' | 'test-b@example.test' } = {}) {
  const { emptyDesign } = await import('../../src/model/design')
  const db = await signedInClient(opts.email)
  const { data, error } = await db
    .from('designs')
    .insert({ origin: opts.origin ?? 'blank', title, data: { ...emptyDesign(), title }, summary: { filledSections: [], tradeoffs: 0, mlTask: null } })
    .select('id')
    .single()
  if (error) throw error
  return data.id as string
}

/** Signs in on the home screen, then opens /d/:id. */
export async function openCloud(page: import('@playwright/test').Page, id: string) {
  await page.goto('/')
  await signInAsTestUser(page)
  await page.goto(`/d/${id}`)
  await page.getByRole('button', { name: 'Canvas', exact: true }).waitFor()
}

/** Service-role REST insert, bypassing RLS: seeds rows only the server may write (runs, findings). */
export async function serviceInsert(table: string, rows: object[]) {
  const key = process.env.SUPABASE_SECRET_KEY!
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(rows),
  })
  if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text()}`)
}

export const TEST_A = '00000000-0000-4000-a000-00000000000a'

/** Saves the valid test key for test user A, as the settings dialog would. */
export const saveTestKey = async () => {
  const { VALID_KEY } = await import('../mocks/openrouter/server')
  await serviceRpc('svc_set_openrouter_key', { p_user: TEST_A, p_key: VALID_KEY })
}

/** Signed in as A, with the key, on a cloud copy of the example. Returns the design id. */
export async function openExampleWithKey(page: import('@playwright/test').Page) {
  const { exampleDesign } = await import('../helpers')
  const design = await exampleDesign()
  const db = await signedInClient()
  const { data } = await db.from('designs').insert({ origin: 'example', source_id: 'retail-demand-forecasting', title: design.title, data: design, summary: { filledSections: [], tradeoffs: 7, mlTask: null } }).select('id').single()
  await saveTestKey()
  await openCloud(page, data!.id)
  return data!.id as string
}

/** AI Review → Review whole design, or one section by name. */
export async function runReview(page: import('@playwright/test').Page, section?: string) {
  await page.getByRole('button', { name: 'AI Review', exact: true }).click()
  const menu = page.getByRole('menu', { name: 'AI Review' })
  await menu.getByRole('menuitem', { name: section ?? 'Review whole design', exact: true }).click()
}

export const reviewPanel = (page: import('@playwright/test').Page) => page.getByRole('complementary', { name: 'Review' })

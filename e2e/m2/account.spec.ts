import { execFileSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL } from '../global-setup'
import { VALID_KEY } from '../mocks/openrouter/server'
import { expect, test } from './fixtures'
import { answerDialog } from '../helpers'

const admin = (path: string, init: RequestInit = {}) =>
  fetch(`${SUPABASE_URL}/auth/v1/admin/${path}`, {
    ...init,
    headers: { apikey: process.env.SUPABASE_SECRET_KEY!, Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY}`, 'Content-Type': 'application/json' },
  })

/** A throwaway user (seed users must stay), signed in like the app. */
async function throwawayUser() {
  const email = `delete-me-${crypto.randomUUID()}@example.test`
  const created = await (await admin('users', { method: 'POST', body: JSON.stringify({ email, password: 'test-password', email_confirm: true }) })).json()
  const db = createClient(SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } })
  const { error } = await db.auth.signInWithPassword({ email, password: 'test-password' })
  if (error) throw error
  const session = (await db.auth.getSession()).data.session!
  return { id: created.id as string, email, db, session, token: session.access_token }
}

const call = async (fn: string, token: string | null, body: object = {}) => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
    method: 'POST',
    headers: { apikey: process.env.SUPABASE_PUBLISHABLE_KEY!, 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: JSON.stringify(body),
  })
  return { status: res.status, body: await res.json().catch(() => null) }
}

test('m2-account-01: delete-account removes the user, their designs, findings and Vault key', async () => {
  const u = await throwawayUser()
  await u.db.from('designs').insert({ origin: 'blank', title: 'Mine', data: {}, summary: {} })
  expect((await call('openrouter-key', u.token, { action: 'save', key: VALID_KEY })).status).toBe(200)

  expect(await call('delete-account', u.token)).toEqual({ status: 200, body: {} })

  expect((await admin(`users/${u.id}`)).status).toBe(404)
  const svc = createClient(SUPABASE_URL, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } })
  expect((await svc.from('designs').select('id').eq('user_id', u.id)).data).toEqual([])
  expect((await svc.from('user_settings').select('user_id').eq('user_id', u.id)).data).toEqual([])
  // Vault is not exposed through REST: count the user's secret in the local database directly.
  const sql = `select count(*) from vault.secrets where name = 'openrouter:${u.id}'`
  expect(execFileSync('docker', ['exec', 'supabase_db_ml-design-doc-reviewer-m2', 'psql', '-U', 'postgres', '-Atc', sql], { encoding: 'utf8' }).trim()).toBe('0')
})

test('m2-account-01: delete-account needs a signed-in user', async () => {
  expect((await call('delete-account', null)).status).toBe(401)
})

test('m2-account-02: Delete account on /privacy asks first, then signs out with the account gone', async ({ page }) => {
  const u = await throwawayUser()
  // supabase-js keeps the session under sb-<host>-auth-token; start the app already signed in as the throwaway user.
  await page.addInitScript((session) => localStorage.setItem('sb-127-auth-token', session), JSON.stringify(u.session))
  await page.goto('/privacy')
  await page.getByRole('button', { name: `Delete account ${u.email}` }).click()
  expect(await answerDialog(page, 'Cancel')).toContain('removed for good')
  expect((await admin(`users/${u.id}`)).status).toBe(200)

  await page.getByRole('button', { name: `Delete account ${u.email}` }).click()
  await answerDialog(page, 'Delete account')
  await expect(page.getByTestId('toast')).toContainText('Your account was deleted')
  await expect(page.getByRole('button', { name: 'Sign in with Google' }).first()).toBeVisible()
  expect((await admin(`users/${u.id}`)).status).toBe(404)
})

test('m2-account-03: /privacy is linked from the home screen', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Privacy' }).click()
  await expect(page).toHaveURL(/\/privacy$/)
  await expect(page.getByRole('heading', { name: 'Privacy' })).toBeVisible()
  await expect(page.getByText('Delete account below removes your account')).toBeVisible()
  // Guests see no delete button.
  await expect(page.getByRole('button', { name: /^Delete account/ })).toHaveCount(0)
})

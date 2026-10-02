import type { SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_URL } from '../global-setup'
import { VALID_KEY } from '../mocks/openrouter/server'
import { expect, serviceRpc, signedInClient, TEST_A, test } from './fixtures'

async function call(fn: string, db: SupabaseClient | null, body: object) {
  const token = db && (await db.auth.getSession()).data.session!.access_token
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
    method: 'POST',
    headers: { apikey: process.env.SUPABASE_PUBLISHABLE_KEY!, 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  return { status: res.status, text, body: JSON.parse(text) }
}

const settings = async (db: SupabaseClient) => (await db.from('user_settings').select('key_last4, key_added_at').maybeSingle()).data

test('m2-review-04: a valid key is saved to Vault and only its last 4 come back', async () => {
  const db = await signedInClient()
  const res = await call('openrouter-key', db, { action: 'save', key: VALID_KEY })
  expect(res.status).toBe(200)
  expect(res.body).toEqual({ last4: 'a3f9', addedAt: expect.any(String) })
  expect(res.text).not.toContain(VALID_KEY)
  expect(await settings(db)).toMatchObject({ key_last4: 'a3f9' })
  expect(await serviceRpc('svc_get_openrouter_key', { p_user: TEST_A })).toBe(VALID_KEY)
})

test('m2-review-04: a rejected key is not stored; a malformed one is refused before OpenRouter', async () => {
  const db = await signedInClient()
  expect(await call('openrouter-key', db, { action: 'save', key: 'sk-or-v1-wrongkey123' })).toMatchObject({ status: 422, body: { error: { code: 'key_rejected' } } })
  expect(await call('openrouter-key', db, { action: 'save', key: 'sk-or-v1-wrong' })).toMatchObject({ status: 400, body: { error: { code: 'invalid_key_format' } } })
  expect(await settings(db)).toBeNull()
  expect(await serviceRpc('svc_get_openrouter_key', { p_user: TEST_A })).toBeNull()
})

test('m2-review-04: delete removes the key', async () => {
  const db = await signedInClient()
  await call('openrouter-key', db, { action: 'save', key: VALID_KEY })
  expect(await call('openrouter-key', db, { action: 'delete' })).toMatchObject({ status: 200, body: {} })
  expect(await settings(db)).toMatchObject({ key_last4: null, key_added_at: null })
  expect(await serviceRpc('svc_get_openrouter_key', { p_user: TEST_A })).toBeNull()
})

test('m2-review-04: both functions need a signed-in user', async () => {
  expect((await call('openrouter-key', null, { action: 'delete' })).status).toBe(401)
  expect((await call('openrouter-models', null, {})).status).toBe(401)
})

test('m2-review-04: the model list has only image-capable models with structured outputs, recommended first and default, no prices', async () => {
  const db = await signedInClient()
  const res = await call('openrouter-models', db, {})
  expect(res.status).toBe(200)
  expect(res.body).toEqual({
    models: [
      { id: 'google/gemini-2.5-flash', name: 'Google: Gemini 2.5 Flash' },
      { id: 'anthropic/claude-sonnet-4.5', name: 'Anthropic: Claude Sonnet 4.5' },
      { id: 'openai/gpt-4o-mini', name: 'OpenAI: GPT-4o-mini' },
    ],
    default: 'google/gemini-2.5-flash',
  })
  expect(res.text).not.toContain('pricing')
})

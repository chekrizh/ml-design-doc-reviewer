import { execFileSync, spawnSync } from 'node:child_process'
import type { SupabaseClient } from '@supabase/supabase-js'
import { reviewRequest } from '../../src/review/request'
import { SUPABASE_URL } from '../global-setup'
import { exampleDesign } from '../helpers'
import { mockOpenRouter, VALID_KEY, type ChatScenario } from '../mocks/openrouter/server'
import { createCloudDesign, expect, serviceInsert, serviceRpc, signedInClient, TEST_A, test } from './fixtures'

const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAwS2OUAAAAABJRU5ErkJggg=='

async function setup() {
  const db = await signedInClient()
  const design = await exampleDesign()
  const { data } = await db.from('designs').insert({ origin: 'example', title: design.title, data: design, summary: { filledSections: [], tradeoffs: 0, mlTask: null } }).select('id').single()
  return { db, design, designId: data!.id as string }
}

const jwt = async (db: SupabaseClient) => (await db.auth.getSession()).data.session!.access_token

async function review(db: SupabaseClient | null, body: object, headers: Record<string, string> = {}) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/review`, {
    method: 'POST',
    headers: { apikey: process.env.SUPABASE_PUBLISHABLE_KEY!, 'Content-Type': 'application/json', ...(db && { Authorization: `Bearer ${await jwt(db)}` }), ...headers },
    body: JSON.stringify(body),
  })
  return { status: res.status, body: await res.json(), headers: res.headers }
}

const body = async (designId: string, scope: string = 'design', runId = crypto.randomUUID()) =>
  reviewRequest(await exampleDesign(), designId, runId, scope as 'design', async () => PNG)

const saveKey = () => serviceRpc('svc_set_openrouter_key', { p_user: TEST_A, p_key: VALID_KEY })
const run = async (db: SupabaseClient, id: string) => (await db.from('review_runs').select('scope, status, error_code, model, design_version').eq('id', id).single()).data

test('m2-review-03: a full review with R1 stores the run and 5 findings with resolved anchors; the request had 3 images', async () => {
  const { db, design, designId } = await setup()
  await saveKey()
  const req = await body(designId)
  const res = await review(db, req)
  expect(res.status).toBe(200)
  expect(res.body.runId).toBe(req.runId)
  const fs = res.body.findings as Record<string, string>[]
  expect(fs.map((f) => [f.severity, f.section, f.anchor_kind, f.anchor_label])).toEqual([
    ['critical', 'evaluation-online', 'key_property', 'Key Metric'],
    ['major', 'evaluation-online', 'tradeoff_option', 'Split by distribution center'],
    ['minor', 'evaluation-online', 'rationale', 'Rationale'],
    ['major', null, 'design', 'Design'],
    ['minor', 'problem-space', 'rationale', 'Rationale'],
  ])
  const km = design.sections.find((s) => s.id === 'evaluation-online')!.keyProperties.find((p) => p.key === 'Key Metric')!
  expect(fs[0]).toMatchObject({ anchor_id: km.id, anchor_value: km.value, status: 'open', title: 'Average check does not measure the stated goal' })
  expect(await run(db, req.runId)).toEqual({ scope: 'design', status: 'succeeded', error_code: null, model: 'google/gemini-2.5-flash', design_version: 1 })
  const sent = await mockOpenRouter.lastRequest()
  expect(sent.body.model).toBe('google/gemini-2.5-flash')
  expect(sent.body.messages[1].content.filter((p: { type: string }) => p.type === 'image_url')).toHaveLength(3)
  expect(sent.headers.authorization).toBeUndefined()
})

test('m2-review-03: a section run replaces only that section; replaced findings stay as history; the user model is used', async () => {
  const { db, designId } = await setup()
  await saveKey()
  expect((await db.from('user_settings').update({ model: 'openai/gpt-4o-mini' }).eq('user_id', TEST_A).select('model')).data).toEqual([{ model: 'openai/gpt-4o-mini' }])
  expect((await review(db, await body(designId))).status).toBe(200)
  await mockOpenRouter.scenario('R2')
  const second = await body(designId, 'evaluation-online')
  const res = await review(db, second)
  expect(res.status).toBe(200)
  expect(res.body.findings.map((f: { title: string }) => f.title)).toEqual(['Primary metric is a revenue proxy'])
  const current = (await db.from('findings').select('title').is('replaced_by_run_id', null).order('title')).data!.map((f) => f.title)
  expect(current).toEqual(['Antigoals are not stated', 'Out-of-stock is called costlier than overstock, but neither cost is estimated', 'Primary metric is a revenue proxy'])
  expect((await db.from('findings').select('id').eq('replaced_by_run_id', second.runId)).data).toHaveLength(3)
  expect((await run(db, second.runId))!.model).toBe('openai/gpt-4o-mini')
})

test('m2-review-03: auth, ownership and key come first', async () => {
  const { db, designId } = await setup()
  expect((await review(null, await body(designId))).body.error.code).toBe('unauthenticated')
  expect((await review(null, await body(designId))).status).toBe(401)
  const other = await createCloudDesign('B', { email: 'test-b@example.test' })
  expect(await review(db, await body(other))).toMatchObject({ status: 404, body: { error: { code: 'not_found' } } })
  expect(await review(db, await body(designId))).toMatchObject({ status: 409, body: { error: { code: 'no_key', message: 'Add your OpenRouter key' } } })
})

test('m2-review-03: every provider error maps to its code and status, and the run is failed with it', async () => {
  const { db, designId } = await setup()
  await saveKey()
  const table: [ChatScenario, string, number][] = [
    ['401', 'key_rejected', 502],
    ['402', 'no_credits', 502],
    ['429', 'provider_rate_limited', 502],
    ['no_images', 'model_unsupported', 502],
    ['408', 'timeout', 504],
    ['500', 'provider_error', 502],
    ['bad_output', 'bad_output', 502],
  ]
  for (const [scenario, code, status] of table) {
    await mockOpenRouter.scenario(scenario)
    const req = await body(designId)
    const res = await review(db, req)
    expect([scenario, res.status, res.body.error.code]).toEqual([scenario, status, code])
    expect(await run(db, req.runId)).toMatchObject({ status: 'failed', error_code: code })
  }
  expect((await db.from('findings').select('id')).data).toEqual([])
})

test('m2-review-03: limits: one running review, stale runs time out, 20 per hour, payload size', async () => {
  const { db, designId } = await setup()
  await saveKey()
  const runRow = (minutesAgo: number, status = 'running') => ({ id: crypto.randomUUID(), design_id: designId, user_id: TEST_A, scope: 'design', model: 'm', status, design_version: 1, design_snapshot: {}, started_at: new Date(Date.now() - minutesAgo * 60_000).toISOString() })
  const fresh = runRow(1)
  await serviceInsert('review_runs', [fresh])
  expect(await review(db, await body(designId))).toMatchObject({ status: 409, body: { error: { code: 'review_in_progress' } } })
  // A run older than 3 minutes is timed out and no longer blocks.
  await db.from('review_runs').update({ status: 'canceled' }).eq('id', fresh.id)
  const stale = runRow(4)
  await serviceInsert('review_runs', [stale])
  expect((await review(db, await body(designId))).status).toBe(200)
  expect(await run(db, stale.id)).toMatchObject({ status: 'failed', error_code: 'timeout' })

  await serviceInsert('review_runs', [...Array(17)].map(() => runRow(30, 'succeeded')))
  expect(await review(db, await body(designId))).toMatchObject({ status: 429, body: { error: { code: 'too_many_reviews' } } })

  const big = await body(designId)
  big.images = [...Array(10)].map(() => ({ section: 'validation', png: PNG }))
  expect(await review(db, big)).toMatchObject({ status: 413, body: { error: { code: 'payload_too_large' } } })
})

test('m2-review-03: a run canceled while waiting for the model keeps the previous findings', async () => {
  const { db, designId } = await setup()
  await saveKey()
  expect((await review(db, await body(designId))).status).toBe(200)
  await mockOpenRouter.scenario('R2', 2000)
  const req = await body(designId)
  const pending = review(db, req)
  await expect.poll(async () => (await run(db, req.runId))?.status).toBe('running')
  const cancel = await db.from('review_runs').update({ status: 'canceled' }).eq('id', req.runId).select('id')
  expect(cancel.data).toHaveLength(1)
  expect(await pending).toMatchObject({ status: 409, body: { error: { code: 'canceled' } } })
  expect(await run(db, req.runId)).toMatchObject({ status: 'canceled' })
  expect((await db.from('findings').select('id').is('replaced_by_run_id', null)).data).toHaveLength(5)
})

test('m2-review-03: the function answers preflight and its responses are JSON errors', async () => {
  // Origin filtering is unit-tested (cors.test.ts): the local gateway rewrites CORS headers to '*'.
  const res = await fetch(`${SUPABASE_URL}/functions/v1/review`, { method: 'POST', headers: { apikey: process.env.SUPABASE_PUBLISHABLE_KEY!, 'Content-Type': 'application/json' }, body: '{}' })
  expect(res.status).toBe(400)
  expect(await res.json()).toEqual({ error: { code: 'bad_request', message: 'The request could not be read' } })
})

test('m2-review-03: function logs contain no keys, headers or bodies', async () => {
  const { db, designId } = await setup()
  await saveKey()
  const since = new Date(Date.now() - 1000).toISOString()
  expect((await review(db, await body(designId))).status).toBe(200)
  await mockOpenRouter.scenario('401')
  await review(db, await body(designId))
  const container = execFileSync('docker', ['ps', '--format', '{{.Names}}'], { encoding: 'utf8' }).split('\n').find((n) => n.startsWith('supabase_edge_runtime_'))!
  // The runtime writes to stdout and stderr: read both.
  const read = () => {
    const r = spawnSync('docker', ['logs', '--since', since, container], { encoding: 'utf8' })
    return r.stdout + r.stderr
  }
  await expect.poll(read).toContain('"code":"key_rejected"')
  const logs = read()
  expect(logs).toContain('{"fn":"review","code":"ok"')
  for (const secret of [VALID_KEY, 'Bearer', 'Average check', 'Supermegaretail', PNG.slice(0, 20)]) expect(logs).not.toContain(secret)
})

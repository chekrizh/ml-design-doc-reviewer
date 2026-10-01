import { stubGoogle, type GisOutcome } from '../mocks/google/google'
import { MOCK_PORT, mockOpenRouter, VALID_KEY } from '../mocks/openrouter/server'
import { expect, test } from './fixtures'

const OR = `http://127.0.0.1:${MOCK_PORT}/api/v1`
const bearer = (key: string) => ({ Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' })

const DESIGN_TEXT = [
  '# Supermegaretail Demand Forecasting',
  '',
  '## Problem Space [section:problem-space]',
  'Key properties:',
  '- [kp:k1] Key Metric: should not match, wrong section',
  '',
  '## Evaluation (Online) [section:evaluation-online]',
  'Key properties:',
  '- [kp:k7] Key Metric: Average check',
  'Trade-offs (criteria: Groups independent | Enough units for power):',
  '- [opt:o1] Split by store: No | Yes',
  '- [opt:o2] Split by distribution center (chosen): Yes | Enough with matched store subsets',
].join('\n')

const chat = () =>
  fetch(`${OR}/chat/completions`, {
    method: 'POST',
    headers: bearer(VALID_KEY),
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'instructions' },
        { role: 'user', content: [{ type: 'text', text: DESIGN_TEXT }, { type: 'text', text: 'Diagram of section Validation [section:validation]' }, { type: 'image_url', image_url: { url: 'data:image/png;base64,AAAA' } }] },
      ],
    }),
  })

test('m2-setup-03: /key accepts only the valid test key', async () => {
  const ok = await fetch(`${OR}/key`, { headers: bearer(VALID_KEY) })
  expect(ok.status).toBe(200)
  expect((await ok.json()).data).toMatchObject({ limit: null, usage: 0, is_free_tier: false })
  const bad = await fetch(`${OR}/key`, { headers: bearer('sk-or-v1-wrong') })
  expect(bad.status).toBe(401)
  expect(await bad.json()).toEqual({ error: { code: 401, message: expect.any(String) } })
})

test('m2-setup-03: /models lists models with architecture.input_modalities', async () => {
  const res = await fetch(`${OR}/models?supported_parameters=structured_outputs`)
  const { data } = await res.json()
  expect(data.length).toBeGreaterThan(2)
  for (const m of data) expect(m).toMatchObject({ id: expect.any(String), name: expect.any(String), architecture: { input_modalities: expect.any(Array) } })
  expect(data.some((m: { architecture: { input_modalities: string[] } }) => !m.architecture.input_modalities.includes('image'))).toBe(true)
})

test('m2-setup-03: R1 answers five findings with labels resolved to the tags in the design text', async () => {
  const res = await chat()
  expect(res.status).toBe(200)
  const body = await res.json()
  expect(body).toMatchObject({ object: 'chat.completion', choices: [{ finish_reason: 'stop', message: { role: 'assistant' } }] })
  const { findings } = JSON.parse(body.choices[0].message.content)
  expect(findings.map((f: { title: string }) => f.title)).toEqual([
    'Average check does not measure the stated goal',
    'Split by distribution center leaves too few units to detect +0.3%',
    'Control metrics have no thresholds',
    'Out-of-stock is called costlier than overstock, but neither cost is estimated',
    'Antigoals are not stated',
  ])
  expect(findings.map((f: { anchor: string | null }) => f.anchor)).toEqual(['kp:k7', 'opt:o2', 'rationale', null, 'rationale'])
  expect(findings.map((f: { severity: string }) => f.severity)).toEqual(['critical', 'major', 'minor', 'major', 'minor'])
  expect(findings[0].fix).toBe('Make the primary metric waste plus lost sales in money per store-day.')
})

test('m2-setup-03: R2 answers one finding on Key Metric', async () => {
  await mockOpenRouter.scenario('R2')
  const { findings } = JSON.parse((await (await chat()).json()).choices[0].message.content)
  expect(findings).toHaveLength(1)
  expect(findings[0]).toMatchObject({ severity: 'major', section: 'evaluation-online', anchor: 'kp:k7', title: 'Primary metric is a revenue proxy' })
})

test('m2-setup-03: error scenarios answer OpenRouter errors', async () => {
  for (const [scenario, status] of [['401', 401], ['402', 402], ['429', 429], ['no_images', 404]] as const) {
    await mockOpenRouter.scenario(scenario)
    const res = await chat()
    expect(res.status).toBe(status)
    expect((await res.json()).error.code).toBe(status)
  }
  await mockOpenRouter.scenario('no_images')
  expect((await (await chat()).json()).error.message).toContain('image')
  await mockOpenRouter.scenario('bad_output')
  const res = await chat()
  expect(res.status).toBe(200)
  const content = (await res.json()).choices[0].message.content
  expect(() => JSON.parse(content)).toThrow()
})

test('m2-setup-03: delay holds the answer and the last request is recorded without Authorization', async () => {
  await mockOpenRouter.scenario('R1', 600)
  const t0 = Date.now()
  await chat()
  expect(Date.now() - t0).toBeGreaterThanOrEqual(600)
  const last = await mockOpenRouter.lastRequest()
  expect(last.headers.authorization).toBeUndefined()
  expect(JSON.stringify(last)).not.toContain(VALID_KEY)
  const images = last.body.messages[1].content.filter((p: { type: string }) => p.type === 'image_url')
  expect(images).toHaveLength(1)
})

async function requestToken(page: import('@playwright/test').Page) {
  return page.evaluate(
    () =>
      new Promise<unknown>((resolve) => {
        const s = document.createElement('script')
        s.src = 'https://accounts.google.com/gsi/client'
        s.onload = () => {
          type G = { accounts: { oauth2: { initTokenClient: (c: object) => { requestAccessToken: () => void }; hasGrantedAllScopes: (t: object, ...s: string[]) => boolean } } }
          const oauth2 = (window as unknown as { google: G }).google.accounts.oauth2
          const scope = 'https://www.googleapis.com/auth/drive.file'
          oauth2
            .initTokenClient({
              client_id: 'test-client-id.apps.googleusercontent.com',
              scope,
              include_granted_scopes: true,
              callback: (t: { error?: string }) => resolve(t.error ? { error: t.error } : { granted: oauth2.hasGrantedAllScopes(t, scope) }),
              error_callback: (e: { type: string }) => resolve({ errorType: e.type }),
            })
            .requestAccessToken()
        }
        document.head.append(s)
      }),
  )
}

test('m2-setup-03: GIS stub grants, denies or fails to open the popup', async ({ page }) => {
  const expected: Record<GisOutcome, unknown> = {
    grant: { granted: true },
    deny: { error: 'access_denied' },
    popup_blocked: { errorType: 'popup_failed_to_open' },
    popup_closed: { errorType: 'popup_closed' },
  }
  for (const gis of Object.keys(expected) as GisOutcome[]) {
    await page.unrouteAll()
    await stubGoogle(page, { gis })
    await page.goto('/')
    expect(await requestToken(page)).toEqual(expected[gis])
  }
})

const upload = (page: import('@playwright/test').Page, method: 'POST' | 'PATCH', path = '') =>
  page.evaluate(
    async ([method, path]) => {
      const boundary = 'b0undary'
      const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n{"name":"T","mimeType":"application/vnd.google-apps.document"}\r\n--${boundary}\r\nContent-Type: text/html\r\n\r\n<h1>T</h1>\r\n--${boundary}--`
      const res = await fetch(`https://www.googleapis.com/upload/drive/v3/files${path}?uploadType=multipart&fields=id,webViewLink`, {
        method,
        headers: { Authorization: 'Bearer ya29.mock-token-1', 'Content-Type': `multipart/related; boundary=${boundary}` },
        body,
      })
      return { status: res.status, body: await res.json() }
    },
    [method, path] as const,
  )

test('m2-setup-03: Drive stub records create vs update and can fail', async ({ page }) => {
  let requests = await stubGoogle(page)
  await page.goto('/')
  const created = await upload(page, 'POST')
  expect(created.status).toBe(200)
  expect(created.body).toEqual({ id: expect.any(String), webViewLink: expect.stringContaining('https://docs.google.com/document/d/') })
  await upload(page, 'PATCH', '/abc')
  expect(requests.map((r) => r.kind)).toEqual(['create', 'update'])
  expect(requests[0].body).toContain('application/vnd.google-apps.document')
  expect(requests[0].contentType).toContain('multipart/related')

  await page.unrouteAll()
  const failed = await stubGoogle(page, { drive: 'fail' })
  expect((await upload(page, 'POST')).status).toBe(500)
  expect(failed).toHaveLength(1)
  await page.unrouteAll()
  requests = await stubGoogle(page, { drive: 'unauthorized_once' })
  expect((await upload(page, 'POST')).status).toBe(401)
  expect((await upload(page, 'POST')).status).toBe(200)
  expect(requests).toHaveLength(2)
})

test('m2-setup-03: a request to a real external host is caught', async ({ page, externalRequests }) => {
  await page.goto('/')
  await page.evaluate(() => fetch('https://openrouter.ai/api/v1/models').catch(() => null))
  expect(externalRequests).toEqual(['https://openrouter.ai/api/v1/models'])
  // Caught as expected; empty it so this test itself passes.
  externalRequests.length = 0
})

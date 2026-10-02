import { describe, expect, it } from 'vitest'
import { exampleDesign } from '../../../../src/fixtures/example'
import { reviewRequest } from '../../../../src/review/request'
import { resolveAnchor, resolveFindings } from './anchors.ts'
import { ERRORS, providerError } from './errors.ts'
import { buildRequest } from './prompt.ts'
import { FINDINGS_SCHEMA, parseFindings, type ModelFinding } from './schema.ts'
import { serializeDesign } from './serialize.ts'
import { SKILL } from '../skill.generated.ts'

const d = exampleDesign()
const eo = d.sections.find((s) => s.id === 'evaluation-online')!
const km = eo.keyProperties.find((p) => p.key === 'Key Metric')!
const split = eo.tradeoffs.options.find((o) => o.name === 'Split by distribution center')!
const mf = (p: Partial<ModelFinding>): ModelFinding => ({ severity: 'major', dimension: 'Metrics, loss & measurement', section: 'evaluation-online', anchor: null, title: 't', evidence: 'e', why: 'w', fix: 'f', ...p })

describe('serializeDesign (§6.7)', () => {
  it('matches the committed snapshot for the example', async () => {
    await expect(serializeDesign(d)).toMatchFileSnapshot('./__snapshots__/example-design.txt')
  })
  it('labels fields and marks empty sections and values', () => {
    const text = serializeDesign(d)
    expect(text).toContain(`- [kp:${km.id}] Key Metric: Average check, proxy for revenue`)
    expect(text).toContain(`- [opt:${split.id}] Split by distribution center (chosen): Yes | Enough with matched store subsets`)
    expect(text).toContain('Trade-offs (criteria: Groups independent | Enough units for power):')
    expect(text).toContain('Diagram: attached as image [section:validation]')
    expect(text).not.toContain('[section:target-solution]\nDiagram')
    const task = { ...d, sections: d.sections.map((s, i) => (i === 0 ? { ...s, keyProperties: s.keyProperties.map((p) => (p.key === 'ML Task' ? { ...p, value: '' } : p)) } : { ...s, keyProperties: [], rationale: null, tradeoffs: { options: [], criteria: [], chosenId: null }, diagram: { elements: [], files: {} } })) }
    const t = serializeDesign(task)
    expect(t).toMatch(/ML Task: \(empty\)/)
    expect(t).toContain('## Baseline [section:baseline]\n(not filled)')
  })
})

describe('resolveAnchor (§6.8)', () => {
  it('null section → whole design', () => {
    expect(resolveAnchor(mf({ section: null, anchor: `kp:${km.id}` }), d)).toMatchObject({ section: null, anchor_kind: 'design', anchor_id: null })
  })
  it('kp:<id> in the snapshot → key property with its key and value', () => {
    expect(resolveAnchor(mf({ anchor: `kp:${km.id}` }), d)).toMatchObject({ anchor_kind: 'key_property', anchor_id: km.id, anchor_label: 'Key Metric', anchor_value: km.value })
  })
  it('opt:<id> → trade-off option, value is name and cells', () => {
    expect(resolveAnchor(mf({ anchor: `opt:${split.id}` }), d)).toMatchObject({ anchor_kind: 'tradeoff_option', anchor_label: 'Split by distribution center', anchor_value: 'Split by distribution center | Yes | Enough with matched store subsets' })
  })
  it('rationale, null or an unknown label → the section rationale', () => {
    for (const anchor of ['rationale', null, 'kp:nope', 'opt:nope', 'bogus'])
      expect(resolveAnchor(mf({ anchor }), d)).toMatchObject({ section: 'evaluation-online', anchor_kind: 'rationale', anchor_label: 'Rationale', anchor_value: expect.stringContaining('Offline gains') })
  })
  it('cuts titles longer than 120 characters', () => {
    expect(resolveAnchor(mf({ title: 'x'.repeat(200) }), d).title).toHaveLength(120)
  })
  it('a section run keeps only its section; at most 40, most severe first', () => {
    const fs = [mf({ section: null }), mf({ section: 'baseline' }), mf({})]
    expect(resolveFindings(fs, d, 'evaluation-online').map((f) => f.section)).toEqual(['evaluation-online'])
    expect(resolveFindings(fs, d, 'design')).toHaveLength(3)
    const many = [...Array(45)].map((_, i) => mf({ severity: i < 5 ? 'minor' : i === 44 ? 'critical' : 'major', title: String(i) }))
    const kept = resolveFindings(many, d, 'design')
    expect(kept).toHaveLength(40)
    expect(kept.filter((f) => f.severity === 'minor')).toHaveLength(0)
    expect(kept.some((f) => f.severity === 'critical')).toBe(true)
  })
})

describe('the model answer (§6.5)', () => {
  it('strict schema: all fields required, no extra properties, nullable section and anchor', () => {
    const item = FINDINGS_SCHEMA.properties.findings.items
    expect(item.additionalProperties).toBe(false)
    expect(item.required).toEqual(['severity', 'dimension', 'section', 'anchor', 'title', 'evidence', 'why', 'fix'])
    expect(item.properties.section.enum).toContain(null)
  })
  it('parses valid answers and rejects the rest', () => {
    expect(parseFindings(JSON.stringify({ findings: [mf({ anchor: 'rationale' })] }))).toHaveLength(1)
    expect(parseFindings('Here is my review')).toBeNull()
    expect(parseFindings(JSON.stringify({ findings: [{ ...mf({}), severity: 'blocker' }] }))).toBeNull()
    expect(parseFindings(JSON.stringify({ findings: [{ ...mf({}), dimension: 'Vibes' }] }))).toBeNull()
    expect(parseFindings(JSON.stringify({ verdict: 'ok' }))).toBeNull()
  })
})

describe('errors (§6.4)', () => {
  it('maps provider statuses', () => {
    expect(providerError(401, '')).toBe('key_rejected')
    expect(providerError(402, '')).toBe('no_credits')
    expect(providerError(429, '')).toBe('provider_rate_limited')
    expect(providerError(404, 'No endpoints found that support image input')).toBe('model_unsupported')
    expect(providerError(400, 'model does not support the requested modalities')).toBe('model_unsupported')
    expect(providerError(503, 'no provider with the supported parameters')).toBe('model_unsupported')
    expect(providerError(408, '')).toBe('timeout')
    expect(providerError(500, '')).toBe('provider_error')
    expect(providerError(404, 'not found')).toBe('provider_error')
    expect(ERRORS.no_key.status).toBe(409)
  })
})

describe('the request for the example (§6.4 step 6)', () => {
  it('instruction, skill with cache_control, design text, then exactly 3 PNG images', async () => {
    const req = await reviewRequest(d, 'design-1', 'run-1', 'design', async () => 'iVBORw0KGgo=')
    expect(req.images.map((i) => i.section)).toEqual(['validation', 'data-features', 'integration'])
    expect(req.design.sections.every((s) => Object.keys(s.diagram.files).length === 0)).toBe(true)
    const body = buildRequest('google/gemini-2.5-flash', req.design, 'design', req.images)
    expect(body).toMatchObject({ model: 'google/gemini-2.5-flash', max_tokens: 8000, provider: { require_parameters: true }, response_format: { type: 'json_schema', json_schema: { name: 'findings', strict: true } } })
    const [system, user] = body.messages
    expect(system.content[0].text).toContain('doc-only, stage: design doc')
    expect(system.content[0].text).not.toContain('Review only the section')
    expect(system.content[1]).toEqual({ type: 'text', text: SKILL, cache_control: { type: 'ephemeral' } })
    expect(user.content[0]).toEqual({ type: 'text', text: serializeDesign(req.design) })
    const rest = user.content.slice(1)
    expect(rest.map((p) => p.type)).toEqual(['text', 'image_url', 'text', 'image_url', 'text', 'image_url'])
    expect(rest[0]).toEqual({ type: 'text', text: 'Diagram of section Validation [section:validation]' })
    expect(rest.filter((p) => p.type === 'image_url').map((p) => (p as { image_url: { url: string } }).image_url.url)).toEqual(Array(3).fill('data:image/png;base64,iVBORw0KGgo='))
  })
  it('a section run says which section to review', () => {
    const body = buildRequest('m', d, 'evaluation-online', [])
    expect(body.messages[0].content[0].text).toContain('Review only the section [section:evaluation-online] (Evaluation (Online))')
  })
})

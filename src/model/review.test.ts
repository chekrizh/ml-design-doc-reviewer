import { describe, expect, it } from 'vitest'
import type { Finding, ReviewRun } from '@review/types.ts'
import { exampleDesign } from '../fixtures/example'
import { bySeverity, countBySeverity, groups, placement, sectionIndicator, worstSeverity, openInSection } from './review'

const d = exampleDesign()
const eo = d.sections.find((s) => s.id === 'evaluation-online')!
const km = eo.keyProperties.find((p) => p.key === 'Key Metric')!

let n = 0
const f = (p: Partial<Finding>): Finding => ({
  id: `f${++n}`, run_id: 'r', design_id: 'd', position: n, severity: 'major', dimension: 'x', section: 'evaluation-online',
  anchor_kind: 'key_property', anchor_id: km.id, anchor_label: 'Key Metric', anchor_value: km.value,
  title: 't', evidence: 'e', why: 'w', fix: 'x', status: 'open', status_changed_at: null, created_at: '', ...p,
})
const run = (scope: ReviewRun['scope'], status: ReviewRun['status'] = 'succeeded'): ReviewRun => ({ id: scope, scope, status, model: 'm', started_at: '', finished_at: null, error_code: null })

describe('placement and stale (D25)', () => {
  it('a whole-design finding is never stale', () => {
    expect(placement(f({ anchor_kind: 'design', section: null, anchor_id: null }), d)).toEqual({ section: null, stale: null })
  })
  it('same text: in its section, not stale; changed text: stale "changed"', () => {
    expect(placement(f({}), d)).toEqual({ section: 'evaluation-online', stale: null })
    expect(placement(f({ anchor_value: 'Revenue' }), d)).toEqual({ section: 'evaluation-online', stale: 'changed' })
  })
  it('a removed field moves to Whole design as "removed"', () => {
    expect(placement(f({ anchor_id: 'gone' }), d)).toEqual({ section: null, stale: 'removed' })
    expect(placement(f({ anchor_kind: 'tradeoff_option', anchor_id: 'gone' }), d)).toEqual({ section: null, stale: 'removed' })
  })
})

describe('section indicator', () => {
  const crit = f({ severity: 'critical' })
  const minor = f({ severity: 'minor', anchor_kind: 'rationale', anchor_id: null, anchor_value: '' })
  it('grey until a run over the design or the section succeeded', () => {
    expect(sectionIndicator('evaluation-online', [crit], [], d)).toBe('none')
    expect(sectionIndicator('evaluation-online', [crit], [run('design', 'failed')], d)).toBe('none')
    expect(sectionIndicator('evaluation-online', [crit], [run('baseline')], d)).toBe('none')
    expect(sectionIndicator('evaluation-online', [crit], [run('evaluation-online')], d)).toBe('red')
  })
  it('red with open critical/major, green with only minor or none open', () => {
    const runs = [run('design')]
    expect(sectionIndicator('evaluation-online', [crit, minor], runs, d)).toBe('red')
    expect(sectionIndicator('evaluation-online', [{ ...crit, status: 'resolved' }, minor], runs, d)).toBe('green')
    expect(sectionIndicator('baseline', [crit], runs, d)).toBe('green')
  })
})

describe('worst severity, counts, groups', () => {
  const list = [f({ severity: 'minor' }), f({ severity: 'critical' }), f({ section: null, anchor_kind: 'design', anchor_id: null, severity: 'major' }), f({ section: 'problem-space', anchor_kind: 'rationale', anchor_id: null, anchor_value: 'x', severity: 'minor' })]
  it('worst and counts', () => {
    expect(worstSeverity(list)).toBe('critical')
    expect(worstSeverity([])).toBeNull()
    expect(countBySeverity(list)).toEqual({ critical: 1, major: 1, minor: 2 })
    expect(openInSection('evaluation-online', list, d).map((x) => x.severity)).toEqual(['critical', 'minor'])
  })
  it('Whole design first, then canonical order, severity order inside', () => {
    const g = groups(list, d)
    expect(g.map((x) => x.section)).toEqual([null, 'problem-space', 'evaluation-online'])
    expect(g[2].findings.map((x) => x.severity)).toEqual(['critical', 'minor'])
    expect([...list].sort(bySeverity)[0].severity).toBe('critical')
  })
})

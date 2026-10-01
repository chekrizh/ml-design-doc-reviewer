import { describe, expect, it } from 'vitest'
import { diagramNonEmpty } from './rules'
import { emptyDesign, SECTIONS } from './design'

describe('emptyDesign', () => {
  const d = emptyDesign()

  it('has 9 sections in canonical order', () => {
    expect(d.sections.map((s) => s.id)).toEqual([
      'problem-space', 'evaluation-offline', 'baseline', 'validation', 'data-features',
      'evaluation-online', 'integration', 'monitoring', 'target-solution',
    ])
    expect(SECTIONS.map((s) => s.name)).toEqual([
      'Problem Space', 'Evaluation (Offline)', 'Baseline', 'Validation', 'Data & Features',
      'Evaluation (Online)', 'Integration', 'Monitoring', 'Target Solution & Architecture',
    ])
  })

  it('has the template keys with empty values', () => {
    const keys = Object.fromEntries(d.sections.map((s) => [s.id, s.keyProperties.map((p) => p.key)]))
    expect(keys).toEqual({
      'problem-space': ['Domain', 'Business Goal', 'ML Task', 'Constraints'],
      'evaluation-offline': ['Offline Metric', 'Loss', 'Target Value'],
      baseline: ['Approach', 'Baseline Metric'],
      validation: [],
      'data-features': ['Sources', 'Key Features'],
      'evaluation-online': ['Evaluation Type', 'Key Metric'],
      integration: ['Inference Pattern', 'Output', 'Latency Budget'],
      monitoring: ['Data Drift', 'Model Quality', 'Alerting'],
      'target-solution': ['Model Type'],
    })
    expect(d.sections.flatMap((s) => s.keyProperties).every((p) => p.value === '')).toBe(true)
  })

  it('starts with empty title, rationale, trade-offs and diagram, and a layout for every section', () => {
    expect(d.title).toBe('')
    for (const s of d.sections) {
      expect(s.rationale).toBeNull()
      expect(s.tradeoffs).toEqual({ options: [], criteria: [], chosenId: null })
      expect(diagramNonEmpty(s.diagram)).toBe(false) // diagram sections hold only the default "Diagram" word
    }
    expect(d.layout.map((l) => l.i).sort()).toEqual(d.sections.map((s) => s.id).sort())
  })

  it('returns independent copies', () => {
    const a = emptyDesign()
    a.layout[0].x = 99
    expect(emptyDesign().layout[0].x).toBe(0)
  })
})

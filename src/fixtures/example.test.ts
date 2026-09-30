import { expect, it } from 'vitest'
import { diagramNonEmpty, sectionEmpty, tradeoffsComplete } from '../model/rules'
import { SECTIONS } from '../model/design'
import { exampleDesign } from './example'

it('example fills every section, has >=3 complete trade-offs and >=2 diagrams', () => {
  const d = exampleDesign()
  expect(d.title).toBe('Churn Prediction (Telecom)')
  expect(d.sections.map((s) => s.id)).toEqual(SECTIONS.map((s) => s.id))
  expect(d.sections.filter(sectionEmpty)).toEqual([])
  for (const s of d.sections) expect(s.keyProperties.some((p) => p.value)).toBe(true)
  expect(d.sections.filter((s) => tradeoffsComplete(s.tradeoffs)).length).toBeGreaterThanOrEqual(3)
  expect(d.sections.filter((s) => diagramNonEmpty(s.diagram)).length).toBeGreaterThanOrEqual(2)
})

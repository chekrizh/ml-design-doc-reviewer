import { describe, expect, it } from 'vitest'
import { exampleDesign } from '../fixtures/example'
import { emptyDesign } from './design'
import { designHasContent, designSummary } from './summary'

describe('designSummary', () => {
  it('is empty for an empty design', () => {
    expect(designSummary(emptyDesign())).toEqual({ filledSections: [], tradeoffs: 0, mlTask: null })
  })

  it('counts filled sections, complete trade-offs and reads ML Task', () => {
    const d = emptyDesign()
    const ps = d.sections.find((s) => s.id === 'problem-space')!
    ps.keyProperties.find((p) => p.key === 'ML Task')!.value = ' Regression '
    expect(designSummary(d)).toEqual({ filledSections: ['problem-space'], tradeoffs: 0, mlTask: 'Regression' })
    expect(designSummary(exampleDesign()).filledSections).toHaveLength(9)
    const t = d.sections.find((s) => s.id === 'baseline')!.tradeoffs
    t.criteria = [{ id: 'c', name: 'Cost' }]
    t.options = [{ id: 'a', name: 'A', cells: { c: 'low' } }, { id: 'b', name: 'B', cells: { c: 'high' } }]
    t.chosenId = 'a'
    expect(designSummary(d)).toEqual({ filledSections: ['problem-space', 'baseline'], tradeoffs: 1, mlTask: 'Regression' })
  })
})

describe('designHasContent', () => {
  it('needs a title or a filled section', () => {
    const d = emptyDesign()
    expect(designHasContent(d)).toBe(false)
    expect(designHasContent({ ...d, title: 'Mine' })).toBe(true)
    d.sections[1].keyProperties[0].value = 'x'
    expect(designHasContent(d)).toBe(true)
  })
})

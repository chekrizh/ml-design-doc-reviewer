import { describe, expect, it } from 'vitest'
import { emptyDesign, type Section, type TradeOffs } from './design'
import { diagramDrawn, diagramNonEmpty, sectionEmpty, tradeoffsComplete } from './rules'

const complete = (): TradeOffs => ({
  options: [
    { id: 'a', name: 'A', cells: { c: 'x' } },
    { id: 'b', name: 'B', cells: { c: 'y' } },
  ],
  criteria: [{ id: 'c', name: 'Cost' }],
  chosenId: 'a',
})

describe('tradeoffsComplete', () => {
  it('passes with 2 options, 1 criterion, all cells filled, one chosen', () => {
    expect(tradeoffsComplete(complete())).toBe(true)
  })
  it('fails with fewer than 2 options', () => {
    const t = complete()
    t.options.pop()
    expect(tradeoffsComplete(t)).toBe(false)
  })
  it('fails with no criteria', () => {
    expect(tradeoffsComplete({ ...complete(), criteria: [] })).toBe(false)
  })
  it('fails with an empty cell', () => {
    const t = complete()
    t.options[1].cells.c = '  '
    expect(tradeoffsComplete(t)).toBe(false)
  })
  it('fails with a missing cell', () => {
    const t = complete()
    t.options[1].cells = {}
    expect(tradeoffsComplete(t)).toBe(false)
  })
  it('fails with no chosen option', () => {
    expect(tradeoffsComplete({ ...complete(), chosenId: null })).toBe(false)
  })
  it('fails when the chosen option was deleted', () => {
    expect(tradeoffsComplete({ ...complete(), chosenId: 'gone' })).toBe(false)
  })
})

describe('diagramNonEmpty', () => {
  it('is false for an empty scene', () => {
    expect(diagramNonEmpty({ elements: [], files: {} })).toBe(false)
  })
  it('is false when every element is deleted', () => {
    expect(diagramNonEmpty({ elements: [{ isDeleted: true }, { isDeleted: true }], files: {} })).toBe(false)
  })
  it('is true with a live element', () => {
    expect(diagramNonEmpty({ elements: [{ isDeleted: true }, { isDeleted: false }], files: {} })).toBe(true)
  })
})

describe('emptyDesign', () => {
  it('gives the diagram sections a default diagram that is drawn but still empty', () => {
    const d = emptyDesign()
    expect(d.sections.filter((s) => diagramDrawn(s.diagram)).map((s) => s.id)).toEqual(['validation', 'integration', 'target-solution'])
    expect(d.sections.every(sectionEmpty)).toBe(true)
    const def = d.sections.find((s) => s.id === 'validation')!.diagram
    expect(diagramNonEmpty({ ...def, elements: [{ ...def.elements[0], text: 'Train → Val' }] })).toBe(true)
    expect(diagramNonEmpty({ ...def, elements: [...def.elements, { isDeleted: false }] })).toBe(true)
  })
})

describe('sectionEmpty', () => {
  const base = (): Section => emptyDesign().sections[0]
  it('is true for a template section', () => {
    expect(sectionEmpty(base())).toBe(true)
  })
  it('is false with a key property value', () => {
    const s = base()
    s.keyProperties[0].value = 'Payments'
    expect(sectionEmpty(s)).toBe(false)
  })
  it('ignores keys without values', () => {
    const s = base()
    s.keyProperties.push({ id: 'n', key: 'Custom', value: '' })
    expect(sectionEmpty(s)).toBe(true)
  })
  it('is false with rationale text, true with an empty paragraph', () => {
    const s = base()
    s.rationale = { type: 'doc', content: [{ type: 'paragraph' }] }
    expect(sectionEmpty(s)).toBe(true)
    s.rationale = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Why' }] }] }
    expect(sectionEmpty(s)).toBe(false)
  })
  it('is false with any trade-off option', () => {
    const s = base()
    s.tradeoffs.options.push({ id: 'a', name: '', cells: {} })
    expect(sectionEmpty(s)).toBe(false)
  })
  it('is false with a non-empty diagram', () => {
    const s = base()
    s.diagram = { elements: [{ isDeleted: false }], files: {} }
    expect(sectionEmpty(s)).toBe(false)
  })
})

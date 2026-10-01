import { beforeEach, describe, expect, it } from 'vitest'
import { emptyDesign, INITIAL_LAYOUT, type SectionId } from '../model/design'
import { useDesign } from './store'

const st = () => useDesign.getState()
const sec = (sid: SectionId) => st().design.sections.find((s) => s.id === sid)!

beforeEach(() => st().setDesign(emptyDesign()))

describe('store actions', () => {
  it('setTitle updates title and updatedAt', () => {
    const before = st().design.updatedAt
    st().setTitle('Fraud Detection')
    expect(st().design.title).toBe('Fraud Detection')
    expect(st().design.updatedAt).toBeGreaterThanOrEqual(before)
  })

  it('key properties: add, update key and value, remove', () => {
    st().addKeyProperty('validation')
    const p = sec('validation').keyProperties[0]
    expect(p).toMatchObject({ key: '', value: '' })
    st().updateKeyProperty('validation', p.id, { key: 'Strategy' })
    st().updateKeyProperty('validation', p.id, { value: 'OOT Split' })
    expect(sec('validation').keyProperties[0]).toMatchObject({ key: 'Strategy', value: 'OOT Split' })
    st().removeKeyProperty('validation', p.id)
    expect(sec('validation').keyProperties).toEqual([])
  })

  it('setRationale stores rich text', () => {
    const doc = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Why' }] }] }
    st().setRationale('baseline', doc)
    expect(sec('baseline').rationale).toEqual(doc)
  })

  it('trade-offs: add, rename, set cells, choose, remove', () => {
    st().addOption('baseline')
    st().addOption('baseline')
    st().addCriterion('baseline')
    const [a, b] = sec('baseline').tradeoffs.options
    const c = sec('baseline').tradeoffs.criteria[0]
    st().renameOption('baseline', a.id, 'Rules')
    st().renameCriterion('baseline', c.id, 'Cost')
    st().setCell('baseline', a.id, c.id, 'Low')
    st().chooseOption('baseline', a.id)
    let t = sec('baseline').tradeoffs
    expect(t.options[0]).toMatchObject({ name: 'Rules', cells: { [c.id]: 'Low' } })
    expect(t.criteria[0].name).toBe('Cost')
    expect(t.chosenId).toBe(a.id)
    st().chooseOption('baseline', b.id)
    expect(sec('baseline').tradeoffs.chosenId).toBe(b.id)
    st().removeOption('baseline', b.id)
    t = sec('baseline').tradeoffs
    expect(t.options.map((o) => o.id)).toEqual([a.id])
    expect(t.chosenId).toBeNull()
    st().removeCriterion('baseline', c.id)
    t = sec('baseline').tradeoffs
    expect(t.criteria).toEqual([])
    expect(t.options[0].cells).toEqual({})
  })

  it('choosing an option does not touch key properties', () => {
    const p = sec('target-solution').keyProperties[0]
    st().updateKeyProperty('target-solution', p.id, { value: 'XGBoost' })
    st().addOption('target-solution')
    st().chooseOption('target-solution', sec('target-solution').tradeoffs.options[0].id)
    expect(sec('target-solution').keyProperties[0].value).toBe('XGBoost')
  })

  it('setDiagram stores the scene', () => {
    st().setDiagram('validation', { elements: [{ id: 'r', isDeleted: false }], files: {} })
    expect(sec('validation').diagram.elements).toHaveLength(1)
  })

  it('setLayout and resetLayout', () => {
    const moved = INITIAL_LAYOUT.map((l) => (l.i === 'monitoring' ? { ...l, x: 0, y: 0 } : l))
    st().setLayout(moved)
    expect(st().design.layout.find((l) => l.i === 'monitoring')).toMatchObject({ x: 0, y: 0 })
    st().resetLayout()
    expect(st().design.layout).toEqual(INITIAL_LAYOUT)
  })

  it('actions on one section leave the others untouched', () => {
    const others = st().design.sections.filter((s) => s.id !== 'baseline')
    st().addOption('baseline')
    expect(st().design.sections.filter((s) => s.id !== 'baseline')).toEqual(others)
  })
})

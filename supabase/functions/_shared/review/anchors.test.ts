import { describe, expect, it } from 'vitest'
import { fieldText, optionText, plainText } from './anchors.ts'
import { SECTIONS, type ReviewDesign } from './types.ts'
import { SECTIONS as APP_SECTIONS } from '../../../../src/model/design'

it('the shared section list matches the app model', () => {
  expect(SECTIONS.map(([id, name]) => ({ id, name }))).toEqual(APP_SECTIONS.map((s) => ({ id: s.id, name: s.name })))
})

describe('plainText', () => {
  it('one line per block, list items as "- " lines, inline marks flattened', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Business ' }, { type: 'text', text: 'context' }] },
        { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'One' }] }] }, { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Two' }] }] }] },
        { type: 'paragraph' },
      ],
    }
    expect(plainText(doc)).toBe('Business context\n- One\n- Two')
    expect(plainText(null)).toBe('')
  })
})

const design: ReviewDesign = {
  title: 'T',
  sections: [
    {
      id: 'evaluation-online',
      keyProperties: [{ id: 'k1', key: 'Key Metric', value: 'Average check' }],
      rationale: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Why' }] }] },
      tradeoffs: { criteria: [{ id: 'c0', name: 'A' }, { id: 'c1', name: 'B' }], options: [{ id: 'o1', name: 'Split', cells: { c1: 'yes', c0: 'no' } }], chosenId: 'o1' },
      diagram: { elements: [] },
    },
  ],
}

describe('fieldText', () => {
  it('reads key property value, option name with cells in criteria order, rationale text', () => {
    expect(fieldText(design, 'evaluation-online', 'key_property', 'k1')).toBe('Average check')
    expect(optionText(design.sections[0], 'o1')).toBe('Split | no | yes')
    expect(fieldText(design, 'evaluation-online', 'tradeoff_option', 'o1')).toBe('Split | no | yes')
    expect(fieldText(design, 'evaluation-online', 'rationale', null)).toBe('Why')
    expect(fieldText(design, null, 'design', null)).toBe('')
  })
  it('is null for a field that is gone', () => {
    expect(fieldText(design, 'evaluation-online', 'key_property', 'nope')).toBeNull()
    expect(fieldText(design, 'evaluation-online', 'tradeoff_option', 'nope')).toBeNull()
  })
})

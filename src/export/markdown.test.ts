import { describe, expect, it } from 'vitest'
import { emptyDesign } from '../model/design'
import { exampleDesign } from '../fixtures/example'
import { designToMarkdown, richTextToMarkdown, slugify } from './markdown'

describe('designToMarkdown', () => {
  it('renders the example fixture', () => {
    expect(designToMarkdown({ ...exampleDesign(), updatedAt: 0 })).toMatchSnapshot()
  })

  it('excludes empty sections and numbers the rest', () => {
    const d = emptyDesign()
    d.title = 'Fraud Detection'
    d.sections[2].keyProperties[0].value = 'Rules'
    const md = designToMarkdown(d)
    expect(md).toContain('# Fraud Detection\n\n_ML System Architecture Spec_')
    expect(md).toContain('## 1. Baseline')
    expect(md).not.toContain('Problem Space')
    expect(md).toContain('| Approach | Rules |')
    expect(md).not.toContain('Baseline Metric')
  })

  it('marks the chosen option and links diagrams to images/<section-id>.svg', () => {
    const md = designToMarkdown(exampleDesign())
    expect(md).toContain('| ✅ Split by distribution center (chosen) | Yes | Enough with matched store subsets |')
    expect(md).toContain('![Validation diagram](images/validation.svg)')
    expect(md).toContain('![Integration diagram](images/integration.svg)')
    // Target Solution has only the default diagram in the example: not exported.
    expect(md).not.toContain('images/target-solution.svg')
  })

  it('escapes pipes in table cells', () => {
    const d = emptyDesign()
    d.sections[0].keyProperties[0].value = 'a|b'
    expect(designToMarkdown(d)).toContain('| Domain | a\\|b |')
  })
})

describe('richTextToMarkdown', () => {
  it('converts marks, links and lists', () => {
    const t = (text: string, ...marks: string[]) => ({ type: 'text', text, marks: marks.map((type) => ({ type })) })
    const md = richTextToMarkdown({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [t('bold', 'bold'), t(' '), t('it', 'italic'), t(' '), t('x()', 'code'), t(' '), { type: 'text', text: 'site', marks: [{ type: 'link', attrs: { href: 'https://a.b' } }] }] },
        { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [t('one')] }] }] },
        { type: 'orderedList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [t('first')] }] }] },
      ],
    })
    expect(md).toBe('**bold** *it* `x()` [site](https://a.b)\n\n- one\n\n1. first')
  })
})

it('slugify', () => {
  expect(slugify('Fraud Detection')).toBe('fraud-detection')
  expect(slugify('Churn Prediction (Telecom)')).toBe('churn-prediction-telecom')
  expect(slugify('  ')).toBe('untitled-design')
})

it('slugify drops accents instead of turning them into hyphens', () => {
  expect(slugify('Résumé ranking')).toBe('resume-ranking')
})

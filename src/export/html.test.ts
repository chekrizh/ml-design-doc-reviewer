import { expect, it } from 'vitest'
import { exampleDesign } from '../fixtures/example'
import { SECTIONS } from '../model/design'
import { designToHtml } from './html'

it('has the title, all 9 filled section headings, bordered tables and one PNG per non-empty diagram, no SVG', () => {
  const html = designToHtml(exampleDesign(), { validation: 'AAA', 'data-features': 'BBB', integration: 'CCC' })
  expect(html).toContain('<h1>Supermegaretail Demand Forecasting</h1>')
  SECTIONS.forEach((s, i) => expect(html).toContain(`<h2>${i + 1}. ${s.name.replace('&', '&amp;')}</h2>`))
  expect(html.match(/data:image\/png;base64,/g)).toHaveLength(3)
  expect(html).not.toMatch(/svg/i)
  expect(html).toContain('border:1px solid')
  expect(html).toContain('✅ Split by distribution center (chosen)')
})

it('escapes text and omits empty sections', () => {
  const d = exampleDesign()
  d.title = 'A <b>&</b>'
  d.sections[1] = { ...d.sections[1], keyProperties: [], rationale: null, tradeoffs: { options: [], criteria: [], chosenId: null } }
  const html = designToHtml(d, {})
  expect(html).toContain('<h1>A &lt;b&gt;&amp;&lt;/b&gt;</h1>')
  expect(html).not.toContain('Evaluation (Offline)')
  expect(html).not.toContain('data:image/png')
})

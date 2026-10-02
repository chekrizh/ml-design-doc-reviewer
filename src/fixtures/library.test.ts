import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { emptyDesign, SECTIONS, type RichText } from '../model/design'
import { diagramNonEmpty, sectionEmpty, tradeoffsComplete } from '../model/rules'
import { exampleDesign, EXAMPLE_ID, TASK_ID } from './example'
import { LIBRARY, libraryDesign } from './library'

const md = (id: string) => readFileSync(`docs/library/${id}.md`, 'utf8')
/** The markdown of one `## Section`, read independently of the parser. */
const sectionMd = (id: string, name: string) => {
  const text = md(id)
  const start = text.indexOf(`\n## ${name}\n`)
  if (start < 0) return null
  const end = text.indexOf('\n## ', start + 1)
  return text.slice(start, end < 0 ? undefined : end)
}
/** Rationale back to markdown: paragraphs, "- " items, **bold**. */
const toMd = (r: RichText): string[] =>
  (r.content ?? []).map((b) =>
    b.type === 'bulletList'
      ? (b.content ?? []).map((li) => `- ${inlineMd(li.content![0])}`).join('\n')
      : inlineMd(b),
  )
const inlineMd = (p: RichText) => (p.content ?? []).map((t) => (t.marks?.some((m) => m.type === 'bold') ? `**${t.text}**` : t.text)).join('')

describe.each([EXAMPLE_ID, TASK_ID])('library item %s matches its markdown', (id) => {
  const d = libraryDesign(id)

  it('title and kind', () => {
    expect(md(id)).toContain(`# ${d.title}\n`)
    expect(LIBRARY.find((i) => i.id === id)!.source.label.length).toBeGreaterThan(0)
  })

  it.each(SECTIONS.map((s) => [s.name, s.id] as const))('%s: key properties, rationale, trade-offs, chosen option', (name, sid) => {
    const s = d.sections.find((x) => x.id === sid)!
    const text = sectionMd(id, name)
    if (text === null) {
      // Not in the file: as in a new design.
      const fresh = emptyDesign().sections.find((x) => x.id === sid)!
      expect(s.keyProperties.map((p) => [p.key, p.value])).toEqual(fresh.keyProperties.map((p) => [p.key, p.value]))
      expect(sectionEmpty(s)).toBe(true)
      return
    }
    const kpRows = text.slice(text.indexOf('### Key Properties'), text.indexOf('### Rationale')).split('\n').filter((l) => l.startsWith('| ') && !l.startsWith('| Key |'))
    expect(s.keyProperties.map((p) => `| ${p.key} | ${p.value} |`.replace('|  |', '| |'))).toEqual(kpRows.map((l) => l.replace(/\|\s*\|$/, '| |')))

    const rationale = text.slice(text.indexOf('### Rationale\n') + 14, text.indexOf('### Trade-offs')).trim()
    expect(toMd(s.rationale!).join('\n\n')).toBe(rationale)

    const t = text.slice(text.indexOf('### Trade-offs\n') + 15, text.indexOf('### Diagram')).trim()
    if (t === 'None.') {
      expect(s.tradeoffs.options).toEqual([])
      return
    }
    const rows = t.split('\n').filter((l) => l.startsWith('| ') && !l.startsWith('|---'))
    expect(rows[0]).toBe(`| Option | ${s.tradeoffs.criteria.map((c) => c.name).join(' | ')} |`)
    expect(rows.slice(1)).toEqual(s.tradeoffs.options.map((o) => `| ${o.name} | ${s.tradeoffs.criteria.map((c) => o.cells[c.id]).join(' | ')} |`))
    const chosen = s.tradeoffs.options.find((o) => o.id === s.tradeoffs.chosenId)
    expect(t).toContain(`\nChosen: ${chosen!.name}`)
  })
})

it('the example fills all 9 sections with complete trade-offs in 7 (AT-25)', () => {
  const d = exampleDesign()
  expect(d.title).toBe('Supermegaretail Demand Forecasting')
  expect(d.sections.filter(sectionEmpty)).toEqual([])
  for (const s of d.sections) expect(s.keyProperties.every((p) => p.value)).toBe(true)
  expect(d.sections.filter((s) => tradeoffsComplete(s.tradeoffs)).length).toBe(7)
})

it('the task fills only Problem Space and leaves ML Task empty (AT-24)', () => {
  const d = libraryDesign(TASK_ID)
  expect(d.title).toBe('SuperPay Real-Time Fraud Detection')
  expect(d.sections.filter((s) => !sectionEmpty(s)).map((s) => s.id)).toEqual(['problem-space'])
  const ps = d.sections[0]
  expect(ps.keyProperties.find((p) => p.key === 'Domain')!.value).toBe('High-volume payment risk management')
  expect(ps.keyProperties.find((p) => p.key === 'ML Task')!.value).toBe('')
  expect(d.sections.filter((s) => diagramNonEmpty(s.diagram))).toEqual([])
})

it('the Source line is a link plus a note', () => {
  const ex = LIBRARY.find((i) => i.id === EXAMPLE_ID)!
  expect(ex).toMatchObject({ kind: 'example', source: { label: 'Retail_Demand_Forecasting_Design.md', url: expect.stringContaining('github.com/ML-SystemDesign') } })
  expect(ex.source.note).toContain('MIT License')
  expect(LIBRARY.find((i) => i.id === TASK_ID)).toMatchObject({ kind: 'task', source: { label: 'written by the author.', url: null } })
})

describe('example diagrams (m2-lib-02)', () => {
  const d = exampleDesign()
  const diagramMd = (name: string) => {
    const t = sectionMd(EXAMPLE_ID, name)!
    return t.slice(t.indexOf('### Diagram'))
  }

  it.each([
    ['validation', 'Validation'],
    ['data-features', 'Data & Features'],
    ['integration', 'Integration'],
  ] as const)('%s: every [box] of the description is a box, joined by arrows, row by row', (sid, name) => {
    const els = d.sections.find((s) => s.id === sid)!.diagram.elements as { id: string; type: string; text?: string; containerId?: string | null }[]
    const rows = diagramMd(name).split('\n').filter((l) => l.startsWith('- ') && l.includes('['))
    const wanted = rows.map((l) => [...l.matchAll(/\[([^\]]+)\]/g)].map((m) => m[1]))
    const boxText = (r: number) =>
      els.filter((e) => e.type === 'text' && e.containerId?.startsWith(`${sid}-r${r}-b`)).map((e) => e.text!.replace(/\n/g, ' '))
    expect(wanted.map((_, r) => boxText(r))).toEqual(wanted)
    expect(els.filter((e) => e.type === 'rectangle')).toHaveLength(wanted.flat().length)
    expect(els.filter((e) => e.type === 'arrow')).toHaveLength(wanted.reduce((n, r) => n + r.length - 1, 0))
    expect(diagramNonEmpty({ elements: els, files: {} })).toBe(true)
  })

  it('the validation rows carry their fold labels', () => {
    const els = d.sections.find((s) => s.id === 'validation')!.diagram.elements as { type: string; text?: string; containerId?: string | null }[]
    expect(els.filter((e) => e.type === 'text' && !e.containerId).map((e) => e.text)).toEqual(['Fold 1', 'Fold 2', 'Fold 5'])
  })

  it('only these three sections have a non-empty diagram', () => {
    expect(d.sections.filter((s) => diagramNonEmpty(s.diagram)).map((s) => s.id)).toEqual(['validation', 'data-features', 'integration'])
  })
})

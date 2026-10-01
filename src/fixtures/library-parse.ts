// Library items (docs/library/*.md) parsed into designs. Pure: the app feeds it the files through Vite
// (library.ts), Node tests read them with fs (D31).
import { defaultDiagram, emptyDesign, INITIAL_LAYOUT, SECTIONS, type Design, type RichText, type Section, type TradeOffs } from '../model/design'
import { diagramFromDescription } from './diagram'

export interface LibraryItem {
  id: string
  kind: 'example' | 'task'
  title: string
  /** The Source line: a link and the rest of the line (authors, license). */
  source: { label: string; url: string | null; note: string }
  markdown: string
}

/** `## Heading` blocks of a markdown text (or `###` with level 3). */
export function blocks(md: string, level: 2 | 3): Map<string, string> {
  const out = new Map<string, string>()
  const parts = md.split(new RegExp(`^${'#'.repeat(level)} `, 'm')).slice(1)
  for (const p of parts) {
    const nl = p.indexOf('\n')
    out.set(p.slice(0, nl).trim(), p.slice(nl + 1).trim())
  }
  return out
}

/** Rows of a markdown table, header row first, without the separator row. */
export const tableRows = (md: string): string[][] =>
  md
    .split('\n')
    .filter((l) => l.startsWith('|') && !/^\|[-| ]+\|$/.test(l))
    .map((l) => l.slice(1, -1).split('|').map((c) => c.trim()))

/** Inline text with **bold** as TipTap text nodes. */
const inline = (text: string): RichText[] =>
  text
    .split(/(\*\*[^*]+\*\*)/)
    .filter(Boolean)
    .map((t) => (t.startsWith('**') ? { type: 'text', text: t.slice(2, -2), marks: [{ type: 'bold' }] } : { type: 'text', text: t }))

/** Rationale markdown (paragraphs, `- ` lists, **bold**) as a TipTap document. */
export function richText(md: string): RichText {
  return {
    type: 'doc',
    content: md.split(/\n\s*\n/).map((block) => {
      const lines = block.split('\n').map((l) => l.trim())
      if (lines.every((l) => l.startsWith('- ')))
        return {
          type: 'bulletList',
          content: lines.map((l) => ({ type: 'listItem', content: [{ type: 'paragraph', content: inline(l.slice(2)) }] })),
        }
      return { type: 'paragraph', content: inline(lines.join(' ')) }
    }),
  }
}

function tradeoffs(md: string): TradeOffs {
  if (md.startsWith('None')) return { options: [], criteria: [], chosenId: null }
  const [header, ...rows] = tableRows(md)
  const criteria = header.slice(1).map((name, i) => ({ id: `c${i}`, name }))
  const options = rows.map(([name, ...cells], i) => ({
    id: `o${i}`,
    name,
    cells: Object.fromEntries(cells.map((c, j) => [criteria[j].id, c])),
  }))
  const chosen = md.match(/^Chosen: (.+)$/m)?.[1].trim()
  return { criteria, options, chosenId: options.find((o) => o.name === chosen)?.id ?? null }
}

export function parseLibraryItem(id: string, markdown: string): LibraryItem {
  const title = markdown.match(/^# (.+)$/m)![1].trim()
  const kind = markdown.match(/^- Kind: (\w+)/m)![1] as LibraryItem['kind']
  const sourceLine = markdown.match(/^- Source: (.+)$/m)![1].trim()
  const link = sourceLine.match(/^\[([^\]]+)\]\(([^)]+)\),?\s*(.*)$/)
  const source = link ? { label: link[1], url: link[2], note: link[3] } : { label: sourceLine, url: null, note: '' }
  return { id, kind, title, source, markdown }
}

/**
 * The item as a design. Sections missing from the file (a task fills only Problem Space) start
 * as in a new design; a section's diagram 'None.' follows the default diagram rules (M1.1).
 */
export function itemDesign(item: LibraryItem): Design {
  const empty = emptyDesign()
  const parts = blocks(item.markdown, 2)
  const sections = SECTIONS.map((meta, i): Section => {
    const body = parts.get(meta.name)
    if (body === undefined) return empty.sections[i]
    const sub = blocks(body, 3)
    const diagram = sub.get('Diagram') ?? 'None.'
    return {
      id: meta.id,
      keyProperties: tableRows(sub.get('Key Properties') ?? '')
        .slice(1)
        .map(([key, value = ''], j) => ({ id: `${meta.id}-p${j}`, key, value })),
      rationale: sub.get('Rationale') ? richText(sub.get('Rationale')!) : null,
      tradeoffs: tradeoffs(sub.get('Trade-offs') ?? 'None.'),
      diagram: diagram.startsWith('None') ? (meta.diagram ? defaultDiagram() : { elements: [], files: {} }) : diagramFromDescription(meta.id, diagram),
    }
  })
  return { title: item.title, sections, layout: INITIAL_LAYOUT.map((l) => ({ ...l })), updatedAt: Date.now() }
}

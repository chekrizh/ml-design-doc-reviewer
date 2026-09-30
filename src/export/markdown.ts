import { SECTIONS, type Design, type RichText, type Section } from '../model/design'
import { diagramNonEmpty, richTextEmpty, sectionEmpty } from '../model/rules'

export const slugify = (title: string) =>
  title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '') || 'untitled-design'

export const imagePath = (s: Section) => `images/${s.id}.svg`

const cell = (t: string) => t.replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ').trim()
const table = (head: string[], rows: string[][]) =>
  [head, head.map(() => '---'), ...rows].map((r) => `| ${r.map(cell).join(' | ')} |`).join('\n')

const inline = (nodes: RichText[] = []): string =>
  nodes
    .map((n) => {
      if (n.type === 'hardBreak') return '  \n'
      let t = n.text ?? ''
      for (const m of n.marks ?? []) {
        if (m.type === 'bold') t = `**${t}**`
        else if (m.type === 'italic') t = `*${t}*`
        else if (m.type === 'code') t = `\`${t}\``
        else if (m.type === 'link') t = `[${t}](${String(m.attrs?.href ?? '')})`
      }
      return t
    })
    .join('')

const indent = (s: string, pad: string) => s.replace(/\n(?=.)/g, `\n${pad}`)

const block = (n: RichText): string => {
  const kids = n.content ?? []
  switch (n.type) {
    case 'paragraph':
      return inline(kids)
    case 'heading':
      return `${'#'.repeat(Math.min(6, Number(n.attrs?.level ?? 1) + 2))} ${inline(kids)}`
    case 'bulletList':
      return kids.map((li) => `- ${indent(blocks(li), '  ')}`).join('\n')
    case 'orderedList':
      return kids.map((li, i) => `${i + 1}. ${indent(blocks(li), '   ')}`).join('\n')
    case 'codeBlock':
      return `\`\`\`\n${kids.map((k) => k.text ?? '').join('')}\n\`\`\``
    case 'blockquote':
      return blocks(n).replace(/^/gm, '> ')
    case 'horizontalRule':
      return '---'
    default:
      return inline(kids)
  }
}

const blocks = (n: RichText): string =>
  (n.content ?? [])
    .map(block)
    .filter((b) => b.trim())
    .join('\n\n')

export const richTextToMarkdown = (r: RichText | null) => (r ? blocks(r) : '')

function sectionMarkdown(s: Section, n: number, name: string): string {
  const parts = [`## ${n}. ${name}`]
  const props = s.keyProperties.filter((p) => p.value.trim())
  if (props.length) parts.push(table(['Property', 'Value'], props.map((p) => [p.key, p.value])))
  if (!richTextEmpty(s.rationale)) parts.push(richTextToMarkdown(s.rationale))
  const t = s.tradeoffs
  if (t.options.length)
    parts.push(
      '**Trade-off Matrix**',
      table(
        ['Option', ...t.criteria.map((c) => c.name)],
        t.options.map((o) => [
          o.id === t.chosenId ? `✅ ${o.name} (chosen)` : o.name,
          ...t.criteria.map((c) => o.cells[c.id] ?? ''),
        ]),
      ),
    )
  if (diagramNonEmpty(s.diagram)) parts.push(`![${name} diagram](${imagePath(s)})`)
  return parts.join('\n\n')
}

/** Markdown of the design: filled sections only, in canonical order. */
export function designToMarkdown(d: Design): string {
  const filled = SECTIONS.map((meta) => ({ meta, s: d.sections.find((s) => s.id === meta.id)! })).filter(({ s }) => !sectionEmpty(s))
  return [
    `# ${d.title || 'Untitled design'}`,
    '_ML System Architecture Spec_',
    ...filled.map(({ meta, s }, i) => sectionMarkdown(s, i + 1, meta.name)),
  ].join('\n\n') + '\n'
}

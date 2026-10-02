// The document as HTML for Google Docs import (docs/backend-spec.md §8.3): the same sections as the
// document and the Markdown export, tables with explicit borders, diagrams as PNG data URIs, no findings.
import { SECTIONS, type Design, type RichText, type Section, type SectionId } from '../model/design'
import { diagramNonEmpty, richTextEmpty, sectionEmpty } from '../model/rules'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// Google Docs keeps inline styles on import; colors are hex because they leave the app.
const TABLE = 'border-collapse:collapse;width:100%'
const TH = 'border:1px solid #cbd5e1;padding:6px 8px;background:#f8fafc;text-align:left'
const TD = 'border:1px solid #cbd5e1;padding:6px 8px;vertical-align:top'

const inline = (nodes: RichText[] = []): string =>
  nodes
    .map((n) => {
      if (n.type === 'hardBreak') return '<br>'
      let t = esc(n.text ?? '')
      for (const m of n.marks ?? []) {
        if (m.type === 'bold') t = `<strong>${t}</strong>`
        else if (m.type === 'italic') t = `<em>${t}</em>`
        else if (m.type === 'code') t = `<code>${t}</code>`
        else if (m.type === 'link') t = `<a href="${esc(String(m.attrs?.href ?? ''))}">${t}</a>`
      }
      return t
    })
    .join('')

const block = (n: RichText): string => {
  const kids = n.content ?? []
  switch (n.type) {
    case 'paragraph':
      return `<p>${inline(kids)}</p>`
    case 'heading':
      return `<h${Math.min(6, Number(n.attrs?.level ?? 1) + 2)}>${inline(kids)}</h${Math.min(6, Number(n.attrs?.level ?? 1) + 2)}>`
    case 'bulletList':
      return `<ul>${kids.map((li) => `<li>${blocks(li)}</li>`).join('')}</ul>`
    case 'orderedList':
      return `<ol>${kids.map((li) => `<li>${blocks(li)}</li>`).join('')}</ol>`
    case 'codeBlock':
      return `<pre>${esc(kids.map((k) => k.text ?? '').join(''))}</pre>`
    case 'blockquote':
      return `<blockquote>${blocks(n)}</blockquote>`
    case 'horizontalRule':
      return '<hr>'
    default:
      return inline(kids)
  }
}
const blocks = (n: RichText): string => (n.content ?? []).map(block).join('')

const table = (head: string[], rows: string[][]) =>
  `<table style="${TABLE}"><thead><tr>${head.map((h) => `<th style="${TH}">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows
    .map((r) => `<tr>${r.map((c) => `<td style="${TD}">${esc(c)}</td>`).join('')}</tr>`)
    .join('')}</tbody></table>`

function section(s: Section, n: number, name: string, png: string | undefined): string {
  const parts = [`<h2>${n}. ${esc(name)}</h2>`]
  const props = s.keyProperties.filter((p) => p.value.trim())
  if (props.length) parts.push(table(['Property', 'Value'], props.map((p) => [p.key, p.value])))
  if (!richTextEmpty(s.rationale)) parts.push(blocks(s.rationale!))
  const t = s.tradeoffs
  if (t.options.length)
    parts.push(
      '<p><strong>Trade-off Matrix</strong></p>',
      table(['Option', ...t.criteria.map((c) => c.name)], t.options.map((o) => [o.id === t.chosenId ? `✅ ${o.name} (chosen)` : o.name, ...t.criteria.map((c) => o.cells[c.id] ?? '')])),
    )
  if (diagramNonEmpty(s.diagram) && png) parts.push(`<p><img src="data:image/png;base64,${png}" alt="${esc(name)} diagram" style="max-width:100%"></p>`)
  return parts.join('\n')
}

/** HTML of the design for Google Docs: filled sections in canonical order, as in the Markdown export. */
export function designToHtml(d: Design, pngs: Partial<Record<SectionId, string>>): string {
  const filled = SECTIONS.map((meta) => ({ meta, s: d.sections.find((s) => s.id === meta.id)! })).filter(({ s }) => !sectionEmpty(s))
  const title = esc(d.title || 'Untitled design')
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title></head><body>
<h1>${title}</h1>
<p><em>ML System Architecture Spec</em></p>
${filled.map(({ meta, s }, i) => section(s, i + 1, meta.name, pngs[s.id])).join('\n')}
</body></html>`
}

// The design as text for the model, with field labels the model cites back (docs/backend-spec.md §6.7).
// Deterministic: a unit test compares it with a committed snapshot of the example.
import { plainText } from './anchors.ts'
import { sectionName, type ReviewDesign, type ReviewSection } from './types.ts'

/** Same rule as the app's diagramNonEmpty: an untouched default diagram (just 'Diagram') is empty. */
export const diagramNonEmpty = (d: ReviewSection['diagram']): boolean => {
  const live = d.elements.filter((e) => !e.isDeleted)
  return live.length > 0 && !(live.length === 1 && live[0].type === 'text' && live[0].text === 'Diagram')
}

const sectionEmpty = (s: ReviewSection) =>
  s.keyProperties.every((p) => !p.value.trim()) && !plainText(s.rationale) && !s.tradeoffs.options.length && !diagramNonEmpty(s.diagram)

const value = (v: string) => (v.trim() ? v.trim() : '(empty)')

function section(s: ReviewSection): string {
  const lines = [`## ${sectionName(s.id)} [section:${s.id}]`]
  if (sectionEmpty(s)) return [...lines, '(not filled)'].join('\n')
  lines.push('Key properties:')
  if (!s.keyProperties.length) lines.push('(none)')
  for (const p of s.keyProperties) lines.push(`- [kp:${p.id}] ${p.key.trim() || '(no name)'}: ${value(p.value)}`)
  const rationale = plainText(s.rationale)
  lines.push(rationale ? `Rationale [rationale]:\n${rationale}` : 'Rationale [rationale]: (empty)')
  const t = s.tradeoffs
  if (!t.options.length) lines.push('Trade-offs: none')
  else {
    lines.push(`Trade-offs (criteria: ${t.criteria.map((c) => c.name.trim() || '(no name)').join(' | ')}):`)
    for (const o of t.options)
      lines.push(`- [opt:${o.id}] ${o.name.trim() || '(no name)'}${o.id === t.chosenId ? ' (chosen)' : ''}: ${t.criteria.map((c) => value(o.cells[c.id] ?? '')).join(' | ')}`)
  }
  if (diagramNonEmpty(s.diagram)) lines.push(`Diagram: attached as image [section:${s.id}]`)
  return lines.join('\n')
}

export function serializeDesign(d: ReviewDesign): string {
  return [`# ${d.title.trim() || 'Untitled design'}`, ...d.sections.map(section)].join('\n\n') + '\n'
}

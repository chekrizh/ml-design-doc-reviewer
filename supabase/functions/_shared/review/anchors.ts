// Field texts and anchors (docs/backend-spec.md §5.6, §6.8). The serializer and the stale rule use the
// same texts, so a finding is stale exactly when what the model saw differs from what is there now.
import type { AnchorKind, ReviewDesign, ReviewSection, RichNode, SectionId } from './types.ts'

const inline = (n: RichNode): string => (n.text ?? '') + (n.content ?? []).map(inline).join('')

/** Rationale as plain text: one line per block; list items as '- …' lines. */
export function plainText(doc: RichNode | null): string {
  const lines: string[] = []
  const walk = (n: RichNode, bullet: boolean) => {
    if (n.type === 'bulletList' || n.type === 'orderedList') return (n.content ?? []).forEach((li) => walk(li, true))
    if (n.type === 'listItem') return (n.content ?? []).forEach((c, i) => walk(c, bullet && i === 0))
    if (n.type === 'doc' || n.type === 'blockquote') return (n.content ?? []).forEach((c) => walk(c, false))
    const text = inline(n).trim()
    if (text) lines.push(bullet ? `- ${text}` : text)
  }
  if (doc) walk(doc, false)
  return lines.join('\n')
}

export const optionText = (s: ReviewSection, optionId: string): string | null => {
  const o = s.tradeoffs.options.find((x) => x.id === optionId)
  if (!o) return null
  return [o.name, ...s.tradeoffs.criteria.map((c) => o.cells[c.id] ?? '')].join(' | ')
}

/** The current text of a finding's field, or null if the field is gone (§5.6). */
export function fieldText(design: ReviewDesign, section: SectionId | null, kind: AnchorKind, anchorId: string | null): string | null {
  if (kind === 'design' || !section) return ''
  const s = design.sections.find((x) => x.id === section)
  if (!s) return null
  if (kind === 'rationale') return plainText(s.rationale)
  if (kind === 'key_property') return s.keyProperties.find((p) => p.id === anchorId)?.value ?? null
  return optionText(s, anchorId ?? '')
}

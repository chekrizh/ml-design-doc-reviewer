import type { Diagram, RichText, Section, TradeOffs } from './design'

/** Trade-offs count as worked out only with >=2 options, >=1 criterion, every cell filled and one option chosen. */
export const tradeoffsComplete = (t: TradeOffs): boolean =>
  t.options.length >= 2 &&
  t.criteria.length >= 1 &&
  t.options.every((o) => t.criteria.every((c) => (o.cells[c.id] ?? '').trim() !== '')) &&
  t.options.some((o) => o.id === t.chosenId)

export const diagramNonEmpty = (d: Diagram): boolean => d.elements.some((e) => !e.isDeleted)

export const richTextEmpty = (r: RichText | null): boolean => {
  if (!r) return true
  if (r.text?.trim()) return false
  return (r.content ?? []).every(richTextEmpty)
}

export const sectionEmpty = (s: Section): boolean =>
  s.keyProperties.every((p) => p.value.trim() === '') &&
  richTextEmpty(s.rationale) &&
  s.tradeoffs.options.length === 0 &&
  !diagramNonEmpty(s.diagram)

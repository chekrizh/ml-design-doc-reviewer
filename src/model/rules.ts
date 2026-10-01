import type { Diagram, RichText, Section, TradeOffs } from './design'

/** Trade-offs count as worked out only with >=2 options, >=1 criterion, every cell filled and one option chosen. */
export const tradeoffsComplete = (t: TradeOffs): boolean =>
  t.options.length >= 2 &&
  t.criteria.length >= 1 &&
  t.options.every((o) => t.criteria.every((c) => (o.cells[c.id] ?? '').trim() !== '')) &&
  t.options.some((o) => o.id === t.chosenId)

/** Anything on the whiteboard, the default "Diagram" word included: the card shows it and is diagram-wide. */
export const diagramDrawn = (d: Diagram): boolean => d.elements.some((e) => !e.isDeleted)

/** Real content for the document, export and empty-section rules: an untouched default diagram (just "Diagram") is empty. */
export const diagramNonEmpty = (d: Diagram): boolean => {
  const live = d.elements.filter((e) => !e.isDeleted)
  return live.length > 0 && !(live.length === 1 && live[0].type === 'text' && live[0].text === 'Diagram')
}

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

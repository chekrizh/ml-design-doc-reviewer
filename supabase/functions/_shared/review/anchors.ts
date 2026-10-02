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

/** A finding ready for `svc_complete_review_run` (the server adds run, design and user). */
export interface ResolvedFinding {
  severity: import('./types.ts').Severity
  dimension: string
  section: SectionId | null
  anchor_kind: AnchorKind
  anchor_id: string | null
  anchor_label: string
  anchor_value: string
  title: string
  evidence: string
  why: string
  fix: string
}

type ModelFinding = import('./schema.ts').ModelFinding

/** The model's `anchor` label → a field of the snapshot it reviewed (§6.8 table). */
export function resolveAnchor(f: ModelFinding, snapshot: ReviewDesign): ResolvedFinding {
  const base = { severity: f.severity, dimension: f.dimension, title: f.title.slice(0, 120), evidence: f.evidence, why: f.why, fix: f.fix }
  const s = f.section ? snapshot.sections.find((x) => x.id === f.section) : undefined
  if (!s) return { ...base, section: null, anchor_kind: 'design', anchor_id: null, anchor_label: 'Design', anchor_value: '' }
  const [kind, id] = (f.anchor ?? '').split(/:(.*)/s)
  if (kind === 'kp') {
    const p = s.keyProperties.find((x) => x.id === id)
    if (p) return { ...base, section: s.id, anchor_kind: 'key_property', anchor_id: p.id, anchor_label: p.key, anchor_value: p.value }
  }
  if (kind === 'opt') {
    const o = s.tradeoffs.options.find((x) => x.id === id)
    if (o) return { ...base, section: s.id, anchor_kind: 'tradeoff_option', anchor_id: o.id, anchor_label: o.name, anchor_value: optionText(s, o.id)! }
  }
  // 'rationale', null, or a label the model got wrong (but the section right).
  return { ...base, section: s.id, anchor_kind: 'rationale', anchor_id: null, anchor_label: 'Rationale', anchor_value: plainText(s.rationale) }
}

const MAX_FINDINGS = 40
const RANK = { critical: 0, major: 1, minor: 2 } as const

/**
 * The findings a run keeps (§6.4 step 8): anchors resolved; a section run keeps only that section's;
 * at most 40, the most severe first (ties keep the model's order).
 */
export function resolveFindings(fs: ModelFinding[], snapshot: ReviewDesign, scope: 'design' | SectionId): ResolvedFinding[] {
  const resolved = fs.map((f) => resolveAnchor(f, snapshot)).filter((f) => scope === 'design' || f.section === scope)
  if (resolved.length <= MAX_FINDINGS) return resolved
  const keep = new Set(resolved.map((f, i) => [f, i] as const).sort((a, b) => RANK[a[0].severity] - RANK[b[0].severity] || a[1] - b[1]).slice(0, MAX_FINDINGS).map(([f]) => f))
  return resolved.filter((f) => keep.has(f))
}

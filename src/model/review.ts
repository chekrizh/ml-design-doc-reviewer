// Review rules for the UI (pure): where a finding shows, whether it is stale, the section indicator, counts.
import { fieldText } from '@review/anchors.ts'
import { SECTION_IDS, SEVERITIES, type Finding, type FindingStatus, type ReviewRun, type SectionId, type Severity } from '@review/types.ts'
import type { Design } from './design'

export type Stale = 'changed' | 'removed' | null
export const STALE_LABEL = { changed: 'Field changed since review', removed: 'Field removed' } as const

/** Where a finding is shown and whether its field changed since the review (D25, §5.6). */
export function placement(f: Finding, design: Design): { section: SectionId | null; stale: Stale } {
  if (f.anchor_kind === 'design' || !f.section) return { section: null, stale: null }
  const now = fieldText(design, f.section, f.anchor_kind, f.anchor_id)
  if (now === null) return { section: null, stale: 'removed' }
  return { section: f.section, stale: now === f.anchor_value ? null : 'changed' }
}

const rank = (s: Severity) => SEVERITIES.indexOf(s)
export const worstSeverity = (fs: Finding[]): Severity | null => (fs.length ? fs.reduce((a, f) => (rank(f.severity) < rank(a) ? f.severity : a), fs[0].severity) : null)

/** Severity first, then the model's order. */
export const bySeverity = (a: Finding, b: Finding) => rank(a.severity) - rank(b.severity) || a.position - b.position

export const countBySeverity = (fs: Finding[]): Record<Severity, number> => ({
  critical: fs.filter((f) => f.severity === 'critical').length,
  major: fs.filter((f) => f.severity === 'major').length,
  minor: fs.filter((f) => f.severity === 'minor').length,
})

export const withStatus = (fs: Finding[], status: FindingStatus) => fs.filter((f) => f.status === status)

/** Findings grouped for the panel: 'Whole design' (null) first, then sections in canonical order; severity order inside. */
export function groups(fs: Finding[], design: Design): { section: SectionId | null; findings: Finding[] }[] {
  return [null, ...SECTION_IDS]
    .map((section) => ({ section, findings: fs.filter((f) => placement(f, design).section === section).sort(bySeverity) }))
    .filter((g) => g.findings.length)
}

/** A section counts as reviewed once a run over the design or over this section succeeded (§5.5). */
export const sectionReviewed = (runs: ReviewRun[], sid: SectionId) => runs.some((r) => r.status === 'succeeded' && (r.scope === 'design' || r.scope === sid))

export type Indicator = 'none' | 'red' | 'green'

/** Grey: not reviewed; red: open critical or major findings; green: reviewed, nothing or only minor open. */
export function sectionIndicator(sid: SectionId, findings: Finding[], runs: ReviewRun[], design: Design): Indicator {
  if (!sectionReviewed(runs, sid)) return 'none'
  const open = findings.filter((f) => f.status === 'open' && placement(f, design).section === sid)
  return open.some((f) => f.severity !== 'minor') ? 'red' : 'green'
}

/** Open findings shown on a section's card (badge), worst first. */
export const openInSection = (sid: SectionId, findings: Finding[], design: Design) =>
  findings.filter((f) => f.status === 'open' && placement(f, design).section === sid).sort(bySeverity)

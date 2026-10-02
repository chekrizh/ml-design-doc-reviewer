// Review types shared by the app and the edge functions (D24). Pure TS: no Deno, Node or DOM APIs.

/** The 9 sections in canonical order, with their names (same as src/model/design.ts SECTIONS; a unit test checks). */
export const SECTIONS = [
  ['problem-space', 'Problem Space'],
  ['evaluation-offline', 'Evaluation (Offline)'],
  ['baseline', 'Baseline'],
  ['validation', 'Validation'],
  ['data-features', 'Data & Features'],
  ['evaluation-online', 'Evaluation (Online)'],
  ['integration', 'Integration'],
  ['monitoring', 'Monitoring'],
  ['target-solution', 'Target Solution & Architecture'],
] as const

export type SectionId = (typeof SECTIONS)[number][0]
export const SECTION_IDS: readonly SectionId[] = SECTIONS.map((s) => s[0])
export const sectionName = (id: SectionId) => SECTIONS.find((s) => s[0] === id)![1]

/** The parts of the app's Design that the review reads (structurally the same as src/model/design.ts). */
export interface RichNode {
  type: string
  text?: string
  content?: RichNode[]
}
export interface ReviewSection {
  id: SectionId
  keyProperties: { id: string; key: string; value: string }[]
  rationale: RichNode | null
  tradeoffs: {
    options: { id: string; name: string; cells: Record<string, string> }[]
    criteria: { id: string; name: string }[]
    chosenId: string | null
  }
  diagram: { elements: readonly { isDeleted?: boolean; [k: string]: unknown }[]; files?: Record<string, unknown> }
}
export interface ReviewDesign {
  title: string
  sections: ReviewSection[]
}

export type Severity = 'critical' | 'major' | 'minor'
export const SEVERITIES: readonly Severity[] = ['critical', 'major', 'minor']
export type AnchorKind = 'key_property' | 'rationale' | 'tradeoff_option' | 'design'
export type FindingStatus = 'open' | 'resolved' | 'dismissed'

/** A finding as stored in `findings` (docs/backend-spec.md §3.3), as the client reads it. */
export interface Finding {
  id: string
  run_id: string
  design_id: string
  position: number
  severity: Severity
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
  status: FindingStatus
  status_changed_at: string | null
  created_at: string
}

/** A run as the client reads it (§5.5). */
export interface ReviewRun {
  id: string
  scope: 'design' | SectionId
  status: 'running' | 'succeeded' | 'failed' | 'canceled'
  model: string
  started_at: string
  finished_at: string | null
  error_code: string | null
}

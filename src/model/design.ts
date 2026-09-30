// Design data model. A section is one decision area of the system: its key
// properties are the decisions, rationale explains them, the trade-off matrix
// records the alternatives weighed, and the diagram shows the result.

export type SectionId =
  | 'problem-space'
  | 'evaluation-offline'
  | 'baseline'
  | 'validation'
  | 'data-features'
  | 'evaluation-online'
  | 'integration'
  | 'monitoring'
  | 'target-solution'

export interface KeyProperty {
  id: string
  key: string
  value: string
}

export interface TradeOffOption {
  id: string
  name: string
  /** criterion id -> cell text */
  cells: Record<string, string>
}

export interface TradeOffCriterion {
  id: string
  name: string
}

export interface TradeOffs {
  options: TradeOffOption[]
  criteria: TradeOffCriterion[]
  chosenId: string | null
}

/** TipTap/ProseMirror JSON document. */
export interface RichText {
  type: string
  text?: string
  attrs?: Record<string, unknown>
  marks?: { type: string; attrs?: Record<string, unknown> }[]
  content?: RichText[]
}

/** Excalidraw scene as stored: elements plus binary files (images). */
export interface Diagram {
  elements: readonly { isDeleted?: boolean; [k: string]: unknown }[]
  files: Record<string, unknown>
}

export interface Section {
  id: SectionId
  keyProperties: KeyProperty[]
  rationale: RichText | null
  tradeoffs: TradeOffs
  diagram: Diagram
}

/** react-grid-layout item, `i` is the section id. */
export interface LayoutItem {
  i: SectionId
  x: number
  y: number
  w: number
  h: number
}

export interface Design {
  title: string
  /** Always in canonical order. */
  sections: Section[]
  layout: LayoutItem[]
  updatedAt: number
}

export const SECTIONS: { id: SectionId; name: string; keys: string[] }[] = [
  { id: 'problem-space', name: 'Problem Space', keys: ['Domain', 'Business Goal', 'ML Task', 'Constraints'] },
  { id: 'evaluation-offline', name: 'Evaluation (Offline)', keys: ['Offline Metric', 'Loss', 'Target Value'] },
  { id: 'baseline', name: 'Baseline', keys: ['Approach', 'Baseline Metric'] },
  { id: 'validation', name: 'Validation', keys: [] },
  { id: 'data-features', name: 'Data & Features', keys: ['Sources', 'Key Features'] },
  { id: 'evaluation-online', name: 'Evaluation (Online)', keys: ['Evaluation Type', 'Key Metric'] },
  { id: 'integration', name: 'Integration', keys: ['Inference Pattern', 'Output', 'Latency Budget'] },
  { id: 'monitoring', name: 'Monitoring', keys: ['Data Drift', 'Model Quality', 'Alerting'] },
  { id: 'target-solution', name: 'Target Solution & Architecture', keys: ['Model Type'] },
]

export const sectionName = (id: SectionId) => SECTIONS.find((s) => s.id === id)!.name

/** Mockup layout on a 12-column grid: three rows of cards, Target Solution full width at the bottom. */
export const INITIAL_LAYOUT: LayoutItem[] = [
  { i: 'problem-space', x: 0, y: 0, w: 6, h: 8 },
  { i: 'evaluation-offline', x: 6, y: 0, w: 3, h: 8 },
  { i: 'baseline', x: 9, y: 0, w: 3, h: 8 },
  { i: 'validation', x: 0, y: 8, w: 6, h: 8 },
  { i: 'data-features', x: 6, y: 8, w: 6, h: 8 },
  { i: 'evaluation-online', x: 0, y: 16, w: 3, h: 8 },
  { i: 'integration', x: 3, y: 16, w: 6, h: 8 },
  { i: 'monitoring', x: 9, y: 16, w: 3, h: 8 },
  { i: 'target-solution', x: 0, y: 24, w: 12, h: 10 },
]

export const newId = () => crypto.randomUUID()

export const emptyDesign = (): Design => ({
  title: '',
  sections: SECTIONS.map((s) => ({
    id: s.id,
    keyProperties: s.keys.map((key) => ({ id: newId(), key, value: '' })),
    rationale: null,
    tradeoffs: { options: [], criteria: [], chosenId: null },
    diagram: { elements: [], files: {} },
  })),
  layout: INITIAL_LAYOUT.map((l) => ({ ...l })),
  updatedAt: Date.now(),
})

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

/** `diagram`: the section is usually explained with a diagram, so a new design gives it a default one. */
export const SECTIONS: { id: SectionId; name: string; keys: string[]; diagram?: true }[] = [
  { id: 'problem-space', name: 'Problem Space', keys: ['Domain', 'Business Goal', 'ML Task', 'Constraints'] },
  { id: 'evaluation-offline', name: 'Evaluation (Offline)', keys: ['Offline Metric', 'Loss', 'Target Value'] },
  { id: 'baseline', name: 'Baseline', keys: ['Approach', 'Baseline Metric'] },
  { id: 'validation', name: 'Validation', keys: [], diagram: true },
  { id: 'data-features', name: 'Data & Features', keys: ['Sources', 'Key Features'] },
  { id: 'evaluation-online', name: 'Evaluation (Online)', keys: ['Evaluation Type', 'Key Metric'] },
  { id: 'integration', name: 'Integration', keys: ['Inference Pattern', 'Output', 'Latency Budget'], diagram: true },
  { id: 'monitoring', name: 'Monitoring', keys: ['Data Drift', 'Model Quality', 'Alerting'] },
  { id: 'target-solution', name: 'Target Solution & Architecture', keys: ['Model Type'], diagram: true },
]

export const sectionName = (id: SectionId) => SECTIONS.find((s) => s.id === id)!.name

/** Default diagram of the diagram sections: just the word "Diagram" on the whiteboard, an ordinary text element. */
export const defaultDiagram = (): Diagram => ({
  elements: [
    {
      id: newId(),
      type: 'text',
      x: 0,
      y: 0,
      width: 80,
      height: 25,
      angle: 0,
      strokeColor: '#868e96',
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: 2,
      strokeStyle: 'solid',
      roughness: 1,
      opacity: 100,
      groupIds: [],
      frameId: null,
      index: null,
      roundness: null,
      seed: 1,
      version: 1,
      versionNonce: 1,
      isDeleted: false,
      boundElements: null,
      updated: 1,
      link: null,
      locked: false,
      text: 'Diagram',
      originalText: 'Diagram',
      fontSize: 20,
      fontFamily: 5,
      textAlign: 'left',
      verticalAlign: 'top',
      containerId: null,
      autoResize: true,
      lineHeight: 1.25,
    },
  ],
  files: {},
})

/** Default layout (D12): three rows of three cards, widths 4 / 3 / 5 of 12 columns in every row, so the columns line up.
 * Diagram sections sit in the wide columns. Heights (h) follow card content; the values here are only a first guess. */
export const INITIAL_LAYOUT: LayoutItem[] = [
  { i: 'problem-space', x: 0, y: 0, w: 4, h: 10 },
  { i: 'evaluation-offline', x: 4, y: 0, w: 3, h: 10 },
  { i: 'baseline', x: 7, y: 0, w: 5, h: 10 },
  { i: 'validation', x: 0, y: 10, w: 4, h: 10 },
  { i: 'data-features', x: 4, y: 10, w: 3, h: 10 },
  { i: 'target-solution', x: 7, y: 10, w: 5, h: 10 },
  { i: 'evaluation-online', x: 0, y: 20, w: 4, h: 10 },
  { i: 'monitoring', x: 4, y: 20, w: 3, h: 10 },
  { i: 'integration', x: 7, y: 20, w: 5, h: 10 },
]

export const newId = () => crypto.randomUUID()

export const emptyDesign = (): Design => ({
  title: '',
  sections: SECTIONS.map((s) => ({
    id: s.id,
    keyProperties: s.keys.map((key) => ({ id: newId(), key, value: '' })),
    rationale: null,
    tradeoffs: { options: [], criteria: [], chosenId: null },
    diagram: s.diagram ? defaultDiagram() : { elements: [], files: {} },
  })),
  layout: INITIAL_LAYOUT.map((l) => ({ ...l })),
  updatedAt: Date.now(),
})

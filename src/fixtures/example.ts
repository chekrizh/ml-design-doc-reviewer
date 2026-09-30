// Churn Prediction (Telecom): the example design from docs/mockups/canvas.png.
// Used by "Load example" and by the e2e tests.
import { INITIAL_LAYOUT, type Design, type RichText, type SectionId, type TradeOffs } from '../model/design'

const base = (id: string, type: string, x: number, y: number, width: number, height: number) => ({
  id,
  type,
  x,
  y,
  width,
  height,
  angle: 0,
  strokeColor: '#1e1e1e',
  backgroundColor: 'transparent',
  fillStyle: 'solid',
  strokeWidth: 2,
  strokeStyle: 'solid',
  roughness: 1,
  opacity: 100,
  groupIds: [],
  frameId: null,
  index: null,
  roundness: { type: 3 },
  seed: 1,
  version: 1,
  versionNonce: 1,
  isDeleted: false,
  boundElements: null,
  updated: 1,
  link: null,
  locked: false,
})

const box = (id: string, x: number, y: number, label: string, bg = '#e7f5ff') => [
  { ...base(id, 'rectangle', x, y, 160, 70), backgroundColor: bg, boundElements: [{ type: 'text', id: `${id}-t` }] },
  {
    ...base(`${id}-t`, 'text', x + 10, y + 25, 140, 20),
    roundness: null,
    text: label,
    originalText: label,
    fontSize: 16,
    fontFamily: 5,
    textAlign: 'center',
    verticalAlign: 'middle',
    containerId: id,
    autoResize: true,
    lineHeight: 1.25,
  },
]

const arrow = (id: string, x: number, y: number, length: number) => ({
  ...base(id, 'arrow', x, y, length, 0),
  roundness: { type: 2 },
  points: [
    [0, 0],
    [length, 0],
  ],
  lastCommittedPoint: null,
  startBinding: null,
  endBinding: null,
  startArrowhead: null,
  endArrowhead: 'arrow',
  elbowed: false,
})

const p = (...paragraphs: (string | { bullets: string[] })[]): RichText => ({
  type: 'doc',
  content: paragraphs.map((x) =>
    typeof x === 'string'
      ? { type: 'paragraph', content: [{ type: 'text', text: x }] }
      : {
          type: 'bulletList',
          content: x.bullets.map((b) => ({
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: b }] }],
          })),
        },
  ),
})

const matrix = (criteria: string[], options: [string, ...string[]][], chosen: number): TradeOffs => {
  const crit = criteria.map((name, i) => ({ id: `c${i}`, name }))
  const opts = options.map(([name, ...cells], i) => ({
    id: `o${i}`,
    name,
    cells: Object.fromEntries(cells.map((c, j) => [crit[j].id, c])),
  }))
  return { criteria: crit, options: opts, chosenId: opts[chosen].id }
}

const noTradeoffs: TradeOffs = { options: [], criteria: [], chosenId: null }
const noDiagram = { elements: [], files: {} }

const props = (sid: SectionId, pairs: [string, string][]) =>
  pairs.map(([key, value], i) => ({ id: `${sid}-p${i}`, key, value }))

export const exampleDesign = (): Design => ({
  title: 'Churn Prediction (Telecom)',
  updatedAt: Date.now(),
  layout: INITIAL_LAYOUT.map((l) => ({ ...l })),
  sections: [
    {
      id: 'problem-space',
      keyProperties: props('problem-space', [
        ['Domain', 'Telecom (Prepaid)'],
        ['Business Goal', 'Reduce churn by 5%'],
        ['ML Task', 'Binary classification'],
        ['Constraints', 'Fixed discount budget'],
        ['Horizon', '30 days'],
      ]),
      rationale: p(
        'Prepaid subscribers can leave at any time without notice. Retention offers cost money, so the model must rank who to target within a fixed budget.',
      ),
      tradeoffs: noTradeoffs,
      diagram: noDiagram,
    },
    {
      id: 'evaluation-offline',
      keyProperties: props('evaluation-offline', [
        ['Offline Metric', 'Precision@Top-10%'],
        ['Loss', 'LogLoss'],
        ['Target Value', '> 0.35'],
      ]),
      rationale: p('The retention team can only call the top decile, so precision in that slice matters more than global AUC.'),
      tradeoffs: matrix(
        ['Matches business action', 'Stable on imbalance'],
        [
          ['Precision@Top-10%', 'Yes', 'Yes'],
          ['ROC AUC', 'No, global ranking', 'Yes'],
          ['Accuracy', 'No', 'No, 95% trivial'],
        ],
        0,
      ),
      diagram: noDiagram,
    },
    {
      id: 'baseline',
      keyProperties: props('baseline', [
        ['Approach', 'Rule-based'],
        ['Baseline Metric', '12.4% Prec@Top-10%'],
      ]),
      rationale: p('Rules on tenure and recent top-ups are what the retention team uses today, so they are the bar to beat.'),
      tradeoffs: matrix(
        ['Cost', 'Time to ship'],
        [
          ['Rules', 'Low', '1 week'],
          ['Logistic Regression', 'Low', '3 weeks'],
        ],
        0,
      ),
      diagram: noDiagram,
    },
    {
      id: 'validation',
      keyProperties: props('validation', [['Strategy', 'OOT Split']]),
      rationale: p('Train on 12 months, validate on the following month to mimic production drift.'),
      tradeoffs: noTradeoffs,
      diagram: {
        elements: [...box('train', 0, 0, 'TRAIN (T-12)', '#d0bfff'), arrow('tv', 170, 35, 60), ...box('val', 240, 0, 'VAL (T)', '#a5d8ff')],
        files: {},
      },
    },
    {
      id: 'data-features',
      keyProperties: props('data-features', [
        ['Sources', 'CRM, Clicks'],
        ['Key Features', 'Usage, Demographics, Network'],
        ['Volume', '50M/mo'],
      ]),
      rationale: p('Usage aggregates over 7/30/90 days carry most of the signal.', { bullets: ['Usage features', 'Demographics', 'Network quality'] }),
      tradeoffs: noTradeoffs,
      diagram: noDiagram,
    },
    {
      id: 'evaluation-online',
      keyProperties: props('evaluation-online', [
        ['Evaluation Type', 'A/B test, 10%'],
        ['Key Metric', '-2% churn'],
      ]),
      rationale: p('A 10% holdout gives enough power to detect a 2% churn change in four weeks.'),
      tradeoffs: noTradeoffs,
      diagram: noDiagram,
    },
    {
      id: 'integration',
      keyProperties: props('integration', [
        ['Inference Pattern', 'Batch Inference'],
        ['Output', 'Redis Cache'],
        ['Latency Budget', 'Nightly, < 2h'],
      ]),
      rationale: p('Offers are sent once a day, so nightly batch scoring is enough.'),
      tradeoffs: matrix(
        ['Cost', 'Freshness'],
        [
          ['Batch', 'Low', 'Daily'],
          ['Streaming', 'High', 'Minutes'],
        ],
        0,
      ),
      diagram: noDiagram,
    },
    {
      id: 'monitoring',
      keyProperties: props('monitoring', [
        ['Data Drift', 'PSI < 0.2'],
        ['Model Quality', 'Weekly Prec@Top-10%'],
        ['Alerting', 'Slack on breach'],
      ]),
      rationale: p('Labels arrive with a 30-day delay, so input drift is the early signal.'),
      tradeoffs: noTradeoffs,
      diagram: noDiagram,
    },
    {
      id: 'target-solution',
      keyProperties: props('target-solution', [
        ['Model Type', 'Gradient Boosted Machine'],
        ['Algorithm', 'XGBoost Classifier'],
        ['Environment', 'Python / Kubernetes'],
      ]),
      rationale: p('Gradient boosting handles tabular, mixed-type features well and is cheap to serve in batch.'),
      tradeoffs: matrix(
        ['Accuracy', 'Explainability', 'Training cost'],
        [
          ['XGBoost', 'High', 'SHAP', 'Low'],
          ['Neural net', 'High', 'Weak', 'High'],
          ['Logistic Regression', 'Medium', 'Native', 'Low'],
        ],
        0,
      ),
      diagram: {
        elements: [
          ...box('lake', 0, 0, 'DATA LAKES'),
          arrow('a1', 170, 35, 60),
          ...box('svc', 240, 0, 'MODEL SERVICE', '#ffec99'),
          arrow('a2', 410, 35, 60),
          ...box('out', 480, 0, 'OUTPUT'),
        ],
        files: {},
      },
    },
  ],
})

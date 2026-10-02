// Excalidraw diagrams for Library items, built from the "### Diagram" description in the markdown:
// every "- " line with [boxes] is a row; "→" between boxes is an arrow; "Label:" before the first box labels the row.
import type { Diagram, SectionId } from '../model/design'

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

const text = (id: string, x: number, y: number, width: number, label: string, containerId: string | null) => ({
  ...base(id, 'text', x, y, width, 20 * label.split('\n').length),
  roundness: null,
  text: label,
  originalText: label,
  fontSize: 16,
  fontFamily: 5,
  textAlign: containerId ? 'center' : 'left',
  verticalAlign: 'middle',
  containerId,
  autoResize: true,
  lineHeight: 1.25,
})

const box = (id: string, x: number, y: number, width: number, label: string) => [
  { ...base(id, 'rectangle', x, y, width, BOX_H), backgroundColor: '#e7f5ff', boundElements: [{ type: 'text', id: `${id}-t` }] },
  text(`${id}-t`, x + 10, y + (BOX_H - 20 * label.split('\n').length) / 2, width - 20, label, id),
]

/** Breaks a label into lines of at most `max` characters at spaces, so long chains stay compact. */
const wrap = (label: string, max = 18) =>
  label
    .split(' ')
    .reduce<string[]>((lines, w) => {
      const last = lines[lines.length - 1]
      if (last !== undefined && `${last} ${w}`.length <= max) lines[lines.length - 1] = `${last} ${w}`
      else lines.push(w)
      return lines
    }, [])
    .join('\n')

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

const BOX_H = 70
const ARROW = 50
const ROW = 110
const LABEL_W = 90
const boxWidth = (label: string) => Math.max(110, Math.round(Math.max(...label.split('\n').map((l) => l.length)) * 8.5) + 30)

export function diagramFromDescription(sid: SectionId, description: string): Diagram {
  const rows = description
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('- ') && l.includes('['))
  // "each shifted left by …": every next row starts further left, like a rolling window.
  const shift = /shifted left/i.test(description) ? 40 : 0
  const elements: Diagram['elements'][number][] = []
  rows.forEach((line, r) => {
    const label = line.slice(2, line.indexOf('[')).replace(/:\s*$/, '').trim()
    const labels = [...line.matchAll(/\[([^\]]+)\]/g)].map((m) => wrap(m[1]))
    const y = r * ROW
    let x = (label ? LABEL_W : 0) + (rows.length - 1 - r) * shift
    if (label) elements.push(text(`${sid}-r${r}-label`, 0, y + (BOX_H - 20) / 2, LABEL_W - 10, label, null))
    labels.forEach((l, i) => {
      if (i > 0) {
        elements.push(arrow(`${sid}-r${r}-a${i}`, x, y + BOX_H / 2, ARROW))
        x += ARROW
      }
      const w = boxWidth(l)
      elements.push(...box(`${sid}-r${r}-b${i}`, x, y, w, l))
      x += w
    })
  })
  return { elements, files: {} }
}

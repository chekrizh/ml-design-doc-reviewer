interface Box {
  x: number
  y: number
  w: number
  h: number
  /** Set by react-grid-layout on the card being dragged. */
  moved?: boolean
}

/**
 * Lays cards out in rows like text: in reading order (row, then x), left to right, wrapping when a card
 * does not fit. Each row starts below the tallest card of the previous row, so cards of different
 * heights keep the mockup rows and the reading order matches the card order. Every card in a row is
 * stretched to the height of the tallest one, so rows line up. Keeps the input order.
 *
 * A dragged card joins the row whose top is nearest to its own top and goes before a card at the same x.
 */
export function flow<T extends Box>(layout: readonly T[], cols: number): T[] {
  const starts = [...new Set(layout.filter((l) => !l.moved).map((l) => l.y))]
  const row = (l: T) => (l.moved && starts.length ? starts.reduce((a, b) => (Math.abs(b - l.y) < Math.abs(a - l.y) ? b : a)) : l.y)
  const sorted = [...layout].sort((a, b) => row(a) - row(b) || a.x - b.x || Number(!!b.moved) - Number(!!a.moved) || a.y - b.y)
  const placed = new Map<T, T>()
  let current: T[] = []
  let x = 0
  let rowY = 0
  let rowH = 0
  const closeRow = () => {
    for (const item of current) placed.get(item)!.h = rowH
    rowY += rowH
    current = []
    x = 0
    rowH = 0
  }
  for (const item of sorted) {
    const w = Math.min(item.w, cols)
    if (x + w > cols) closeRow()
    placed.set(item, { ...item, x, y: rowY, w, moved: false })
    current.push(item)
    x += w
    rowH = Math.max(rowH, item.h)
  }
  closeRow()
  return layout.map((l) => placed.get(l)!)
}

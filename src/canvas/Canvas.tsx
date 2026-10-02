import { useState } from 'react'
import { GridLayout, useContainerWidth, type Compactor, type Layout } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import type { LayoutItem, SectionId } from '../model/design'
import { ComponentEditor } from '../editor/ComponentEditor'
import { useDesign } from '../store/store'
import { Card } from './Card'
import { flow } from './flow'
import { ReviewPanel } from '../review/ReviewPanel'
import { useReview } from '../review/store'

const flowCompactor: Compactor = {
  type: 'wrap',
  // No pushing while dragging: the flow alone decides where every card goes.
  allowOverlap: true,
  compact: (layout, cols) => flow(layout, cols),
}

const ROW = 4
const GAP = 16
/** Grid rows for a card of `px` pixels: h rows span h*ROW + (h-1)*GAP. */
const rows = (px: number) => Math.ceil((px + GAP) / (ROW + GAP))
// Keep the stored item order; take only positions and sizes from the grid.
const pick = (prev: LayoutItem[], next: Layout): LayoutItem[] =>
  prev.map((p) => {
    const { x, y, w, h } = next.find((n) => n.i === p.i) ?? p
    return { i: p.i, x, y, w, h }
  })
// What the user decides: card order in rows and widths. Heights (and so y) follow measured content,
// so they never count as an edit: opening a design must not write it (M2 autosave, version check).
const shape = (l: LayoutItem[]) => [...l].sort((a, b) => a.y - b.y || a.x - b.x).map((c) => `${c.i}:${c.x}:${c.w}`).join()
const same = (a: LayoutItem[], b: LayoutItem[]) => shape(a) === shape(b)

export function Canvas() {
  const layout = useDesign((s) => s.design.layout)
  const setLayout = useDesign((s) => s.setLayout)
  const { width, containerRef, mounted } = useContainerWidth()
  const [open, setOpen] = useState<SectionId | null>(null)
  const panelOpen = useReview((s) => s.panelOpen)
  // Card heights follow content; the stored h is only a starting guess until the card is measured.
  const [heights, setHeights] = useState<Partial<Record<SectionId, number>>>({})
  const onHeight = (sid: SectionId) => (px: number) => setHeights((h) => (h[sid] === px ? h : { ...h, [sid]: px }))

  return (
    <div className="flex items-start">
    <main className="min-w-0 flex-1 px-4 py-4">
      <div ref={containerRef}>
      {mounted && (
        <GridLayout
          width={width}
          layout={layout.map((l) => ({ ...l, h: heights[l.i] ? rows(heights[l.i]!) : l.h, minW: 3 }))}
          gridConfig={{ cols: 12, rowHeight: ROW, margin: [GAP, GAP], containerPadding: [0, 0] }}
          compactor={flowCompactor}
          dragConfig={{ handle: '.card-drag' }}
          resizeConfig={{ handles: ['w', 'e'] }}
          onLayoutChange={(next) => {
            const prev = useDesign.getState().design.layout
            const items = pick(prev, next)
            if (!same(items, prev)) setLayout(items)
          }}
        >
          {layout.map((l) => (
            <div key={l.i} data-grid-item={l.i}>
              <Card sid={l.i} onDetails={() => setOpen(l.i)} onHeight={onHeight(l.i)} />
            </div>
          ))}
        </GridLayout>
      )}
      </div>
      {open && <ComponentEditor sid={open} onClose={() => setOpen(null)} />}
    </main>
      {panelOpen && (
        <div className="sticky top-16 h-[calc(100vh-4rem)] self-start">
          <ReviewPanel />
        </div>
      )}
    </div>
  )
}

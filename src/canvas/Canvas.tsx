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
// Rows are a fine 8px step (heights round up by at most 7px); the rest of the 16px gap between rows is
// padding at the bottom of each grid item.
const ROW_GAP = 4
const ITEM_PAD = GAP - ROW_GAP
/** Grid rows for a card of `px` pixels plus its bottom padding: h rows span h*ROW + (h-1)*ROW_GAP. */
const rows = (px: number) => Math.ceil((px + ITEM_PAD + ROW_GAP) / (ROW + ROW_GAP))
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
/** Below this card-area width a 12-column row of 3 cards gets too narrow: cards stack in reading order, no drag. */
const GRID_MIN = 960

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
      {/* clip, not hidden: no scroll box, so tooltips still overflow vertically; hides cards animating across the right edge on reflow. */}
      <div ref={containerRef} className="overflow-x-clip">
      {mounted && width < GRID_MIN && (
        <div className="grid gap-4 sm:grid-cols-2">
          {[...layout].sort((a, b) => a.y - b.y || a.x - b.x).map((l) => (
            <div key={l.i} data-grid-item={l.i}>
              <Card sid={l.i} onDetails={() => setOpen(l.i)} onHeight={onHeight(l.i)} />
            </div>
          ))}
        </div>
      )}
      {mounted && width >= GRID_MIN && (
        <GridLayout
          width={width}
          layout={layout.map((l) => ({ ...l, h: heights[l.i] ? rows(heights[l.i]!) : l.h, minW: 3 }))}
          gridConfig={{ cols: 12, rowHeight: ROW, margin: [GAP, ROW_GAP], containerPadding: [0, 0] }}
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
            <div key={l.i} data-grid-item={l.i} style={{ paddingBottom: ITEM_PAD }}>
              <Card sid={l.i} onDetails={() => setOpen(l.i)} onHeight={onHeight(l.i)} />
            </div>
          ))}
        </GridLayout>
      )}
      </div>
      {open && <ComponentEditor sid={open} onClose={() => setOpen(null)} />}
    </main>
      {panelOpen && (
        // Beside the cards under the one-row header from lg up; a full-height overlay on narrower screens.
        <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md shadow-2xl lg:sticky lg:top-16 lg:z-auto lg:h-[calc(100dvh-4rem)] lg:w-auto lg:max-w-none lg:self-start lg:shadow-none">
          <ReviewPanel />
        </div>
      )}
    </div>
  )
}

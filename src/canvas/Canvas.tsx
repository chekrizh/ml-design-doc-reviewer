import { useState } from 'react'
import { GridLayout, useContainerWidth, type Layout } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import type { LayoutItem, SectionId } from '../model/design'
import { ComponentEditor } from '../editor/ComponentEditor'
import { useDesign } from '../store/store'
import { Card } from './Card'

const MIN = { minW: 3, minH: 5 }
// Keep the stored item order; take only positions and sizes from the grid.
const pick = (prev: LayoutItem[], next: Layout): LayoutItem[] =>
  prev.map((p) => {
    const { x, y, w, h } = next.find((n) => n.i === p.i) ?? p
    return { i: p.i, x, y, w, h }
  })
const same = (a: LayoutItem[], b: LayoutItem[]) => JSON.stringify(a) === JSON.stringify(b)

export function Canvas() {
  const layout = useDesign((s) => s.design.layout)
  const setLayout = useDesign((s) => s.setLayout)
  const { width, containerRef, mounted } = useContainerWidth()
  const [open, setOpen] = useState<SectionId | null>(null)

  return (
    <main className="mx-auto max-w-[1600px] px-4 py-4">
      <div ref={containerRef}>
      {mounted && (
        <GridLayout
          width={width}
          layout={layout.map((l) => ({ ...l, ...MIN }))}
          gridConfig={{ cols: 12, rowHeight: 24, margin: [16, 16], containerPadding: [0, 0] }}
          dragConfig={{ handle: '.card-drag' }}
          resizeConfig={{ handles: ['se'] }}
          onLayoutChange={(next) => {
            const prev = useDesign.getState().design.layout
            const items = pick(prev, next)
            if (!same(items, prev)) setLayout(items)
          }}
        >
          {layout.map((l) => (
            <div key={l.i} data-grid-item={l.i}>
              <Card sid={l.i} onDetails={() => setOpen(l.i)} />
            </div>
          ))}
        </GridLayout>
      )}
      </div>
      {open && <ComponentEditor sid={open} onClose={() => setOpen(null)} />}
    </main>
  )
}

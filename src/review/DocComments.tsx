import { useLayoutEffect, useRef } from 'react'
import { withStatus, placement, bySeverity } from '../model/review'
import { useDesign } from '../store/store'
import { fieldKey } from './EditorFindings'
import { FindingCard } from './Finding'
import { SeverityCounts, StatusTabs } from './ReviewPanel'
import { useReview } from './store'
import type { Finding } from '@review/types.ts'

const GAP = 8

/** The document element a comment belongs to: its field, or the document title for the whole design. */
function anchorOf(f: Finding, design: ReturnType<typeof useDesign.getState>['design']): Element | null {
  const { section } = placement(f, design)
  const key = section ? `${section}:${fieldKey(f)}` : 'design'
  return document.querySelector(`[data-field="${key}"]`) ?? document.querySelector('[data-field="design"]')
}

/**
 * Review comments in the document margin (docs/mockups/review-document.html): each at its field's height,
 * pushed down on overlap; the expanded one sits exactly at its field (which is highlighted) and the ones above make room.
 */
export function DocComments() {
  const findings = useReview((s) => s.findings)
  const tab = useReview((s) => s.tab)
  const expanded = useReview((s) => s.expanded)
  const design = useDesign((s) => s.design)
  const margin = useRef<HTMLDivElement>(null)
  const list = withStatus(findings, tab).sort(bySeverity)

  useLayoutEffect(() => {
    const m = margin.current
    if (!m) return
    const layout = () => {
      const base = m.getBoundingClientRect().top
      const items = [...m.querySelectorAll<HTMLElement>('[data-comment]')]
        .map((el) => {
          const f = list.find((x) => x.id === el.dataset.comment)!
          const a = anchorOf(f, useDesign.getState().design)
          return { el, f, anchor: a ? a.getBoundingClientRect().top - base : 0, h: el.offsetHeight, y: 0 }
        })
        .sort((a, b) => a.anchor - b.anchor || bySeverity(a.f, b.f))
      let y = 0
      for (const it of items) {
        it.y = Math.max(it.anchor, y)
        y = it.y + it.h + GAP
      }
      const ai = items.findIndex((it) => it.f.id === expanded)
      if (ai >= 0) {
        items[ai].y = items[ai].anchor
        for (let i = ai - 1; i >= 0; i--) items[i].y = Math.min(items[i].y, items[i + 1].y - items[i].h - GAP)
        for (let i = ai + 1; i < items.length; i++) items[i].y = Math.max(items[i].anchor, items[i - 1].y + items[i - 1].h + GAP)
      }
      for (const it of items) it.el.style.top = `${it.y}px`
      m.style.height = `${items.length ? Math.max(...items.map((it) => it.y + it.h)) : 0}px`
      // Highlight the expanded comment's field.
      document.querySelectorAll('[data-hl]').forEach((el) => el.removeAttribute('data-hl'))
      const active = items[ai]?.f
      if (active && active.status === 'open' && placement(active, useDesign.getState().design).section) anchorOf(active, useDesign.getState().design)?.setAttribute('data-hl', '')
    }
    layout()
    const ro = new ResizeObserver(layout)
    const sheet = document.querySelector('[data-testid="document"]')
    if (sheet) ro.observe(sheet)
    m.querySelectorAll('[data-comment]').forEach((el) => ro.observe(el))
    return () => {
      ro.disconnect()
      document.querySelectorAll('[data-hl]').forEach((el) => el.removeAttribute('data-hl'))
    }
  }, [list, expanded, design])

  if (!findings.length) return null
  return (
    <>
      {/* Kept shorter than the sheet's top padding, so the title's comments start level with the title. */}
      <div data-testid="comments-header" className="z-10 xl:sticky xl:top-16 -mx-1 flex flex-col gap-1.5 bg-slate-50 px-1 pb-1">
        <SeverityCounts findings={findings} />
        <StatusTabs findings={findings} />
      </div>
      <div ref={margin} data-testid="comments-margin" className="relative">
        {list.map((f) => (
          <div key={f.id} data-comment={f.id} className={`absolute inset-x-0 transition-[top] duration-200 motion-reduce:transition-none ${expanded === f.id ? 'z-10' : ''}`}>
            <FindingCard f={f} comment withSection />
          </div>
        ))}
      </div>
    </>
  )
}

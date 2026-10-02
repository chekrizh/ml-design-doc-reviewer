import { useLayoutEffect, useRef } from 'react'
import { sectionName, type SectionId } from '../model/design'
import { diagramDrawn, diagramNonEmpty, tradeoffsComplete } from '../model/rules'
import { InlineText } from '../editor/InlineText'
import { useDiagramImage } from '../export/svg'
import { useDesign, useSection } from '../store/store'
import { SectionIcon } from './SectionIcon'
import { FindingsBadge, ReviewIndicator } from '../review/CardSignals'
import { useReview } from '../review/store'

const MAX_PROPS = 4

export const TRADEOFFS_TIP = {
  off: 'Trade-offs not filled yet. Weigh the alternatives and make a considered choice.',
  on: 'Trade-offs filled: alternatives weighed, choice made.',
}

// A status, not a button: focusable only so keyboard users can read the tooltip.
function TradeoffsStatus({ sid, on }: { sid: SectionId; on: boolean }) {
  const tip = on ? TRADEOFFS_TIP.on : TRADEOFFS_TIP.off
  return (
    <span
      role="img"
      tabIndex={0}
      aria-label={`Trade-offs ${on ? 'filled' : 'not filled'}`}
      aria-describedby={`tradeoffs-tip-${sid}`}
      data-indicator="Trade-offs"
      data-state={on ? 'on' : 'off'}
      onMouseDown={(e) => e.stopPropagation()}
      className={`group relative ml-auto rounded-md p-1 outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${on ? 'text-emerald-600' : 'text-slate-300'}`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
        <path d="M12 3v18M7 21h10M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2M2 16l3-8 3 8c-.9.7-1.9 1-3 1s-2.1-.3-3-1zM16 16l3-8 3 8c-.9.7-1.9 1-3 1s-2.1-.3-3-1z" />
      </svg>
      {on && (
        <svg viewBox="0 0 24 24" className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full bg-emerald-600 text-white" aria-hidden data-check>
          <path d="M6 12l4 4 8-8" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      <span
        id={`tradeoffs-tip-${sid}`}
        role="tooltip"
        className="pointer-events-none absolute top-full right-0 z-20 mt-2 hidden w-64 rounded-lg bg-slate-900 px-3 py-2 text-xs font-normal normal-case tracking-normal text-white shadow-lg group-hover:block group-focus-visible:block"
      >
        {tip}
      </span>
    </span>
  )
}

/** Height the card needs for its content, whatever height the grid gives it now. */
function useNaturalHeight(onHeight: (px: number) => void) {
  const article = useRef<HTMLElement>(null)
  const body = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLDivElement>(null)
  const report = useRef(onHeight)
  useLayoutEffect(() => {
    report.current = onHeight
  })
  useLayoutEffect(() => {
    const measure = () => {
      const a = article.current!, b = body.current!, i = inner.current!
      const cs = getComputedStyle(b)
      const pad = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom)
      report.current(Math.ceil(a.offsetHeight - b.clientHeight + pad + i.offsetHeight))
    }
    const ro = new ResizeObserver(measure)
    ro.observe(article.current!)
    ro.observe(inner.current!)
    return () => ro.disconnect()
  }, [])
  return { article, body, inner }
}

export function Card({ sid, onDetails, onHeight }: { sid: SectionId; onDetails: () => void; onHeight: (px: number) => void }) {
  const { article, body, inner } = useNaturalHeight(onHeight)
  const section = useSection(sid)
  const update = useDesign((s) => s.updateKeyProperty)
  const thumb = useDiagramImage(section.diagram)
  const shown = section.keyProperties.slice(0, MAX_PROPS)
  const hidden = section.keyProperties.length - shown.length
  const hasDiagram = diagramDrawn(section.diagram)
  const highlight = useReview((s) => s.highlight === sid && s.panelOpen)

  return (
    <article ref={article} data-testid={`card-${sid}`} aria-label={sectionName(sid)} data-highlight={highlight || undefined} className={`flex h-full flex-col rounded-2xl border border-slate-200 bg-white shadow-sm ${highlight ? 'ring-2 ring-indigo-300' : ''}`}>
      <header className="card-drag flex cursor-move items-center gap-3 border-b border-slate-100 px-4 py-3">
        <SectionIcon id={sid} className="h-5 w-5 text-slate-700" />
        <h2 className="text-sm font-semibold tracking-wide uppercase">{sectionName(sid)}</h2>
        <TradeoffsStatus sid={sid} on={tradeoffsComplete(section.tradeoffs)} />
        <ReviewIndicator sid={sid} />
      </header>
      <div ref={body} className="min-h-0 flex-1 overflow-hidden px-4 pt-3 pb-2">
        <div ref={inner} className="flex items-start gap-4">
        <dl className="grid min-w-0 flex-1 auto-rows-min grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          {shown.map((p) => (
            <div key={p.id} className="contents">
              <dt className="truncate text-slate-500">{p.key || 'Key'}</dt>
              <dd className="flex min-w-0 font-medium">
                <InlineText label={p.key || 'value'} value={p.value} placeholder="Not set" onSave={(value) => update(sid, p.id, { value })} className="w-full" inputClassName="w-full" />
              </dd>
            </div>
          ))}
          {hidden > 0 && <dd className="col-span-2 text-xs font-medium text-slate-400">+{hidden}</dd>}
        </dl>
        {hasDiagram && (
          // Clicking the picture opens the whiteboard; the Details button stays the accessible way in.
          <div data-testid={diagramNonEmpty(section.diagram) ? 'thumbnail' : 'default-diagram'} onClick={onDetails} className="flex h-36 max-w-[60%] min-w-0 flex-1 cursor-pointer items-center justify-center rounded-xl border border-slate-100 bg-slate-50 p-2">
            {thumb && <img src={thumb} alt={`${sectionName(sid)} diagram`} className="max-h-full max-w-full object-contain" />}
          </div>
        )}
        </div>
      </div>
      <footer className="flex items-center gap-2 border-t border-slate-100 px-4 py-3">
        <FindingsBadge sid={sid} />
        <button type="button" onClick={onDetails} className="ml-auto rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700">
          Details
        </button>
      </footer>
    </article>
  )
}

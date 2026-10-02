import type { SectionId } from '@review/types.ts'
import { openInSection, sectionIndicator, worstSeverity } from '../model/review'
import { useDesign } from '../store/store'
import { SeverityDot } from './Finding'
import { openPanelAt } from './ReviewPanel'
import { useReview } from './store'

const CHECK = (
  <svg viewBox="0 0 24 24" className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full bg-emerald-600 text-white" aria-hidden data-check>
    <path d="M6 12l4 4 8-8" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
const ALERT = (
  <svg viewBox="0 0 24 24" className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full bg-red-600 text-white" aria-hidden data-alert>
    <path d="M12 6.5v6.5M12 17.5v.01" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
  </svg>
)

/** Review indicator next to Trade-offs (magnifier): grey not reviewed, red with '!' for open critical/major, green with a check otherwise. */
export function ReviewIndicator({ sid }: { sid: SectionId }) {
  const { findings, runs, running } = useReview()
  const design = useDesign((s) => s.design)
  const state = sectionIndicator(sid, findings, runs, design)
  const open = openInSection(sid, findings, design)
  const pulsing = !!running && (running.scope === 'design' || running.scope === sid)
  const tip =
    state === 'none'
      ? 'Not reviewed yet.'
      : state === 'red'
        ? `${open.length} open finding${open.length === 1 ? '' : 's'}, ${open.filter((f) => f.severity === 'critical').length} critical.`
        : open.length
          ? `Reviewed. ${open.length} minor suggestion${open.length === 1 ? '' : 's'}.`
          : 'Reviewed. No open findings.'
  const color = pulsing ? 'animate-pulse text-indigo-500' : state === 'red' ? 'text-red-600' : state === 'green' ? 'text-emerald-600' : 'text-slate-300'
  return (
    <span
      role="img"
      tabIndex={0}
      aria-label={`Review: ${tip}`}
      data-indicator="Review"
      data-state={state}
      data-running={pulsing || undefined}
      onMouseDown={(e) => e.stopPropagation()}
      className={`group relative rounded-md p-1 outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${color}`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
      {!pulsing && state === 'red' && ALERT}
      {!pulsing && state === 'green' && CHECK}
      <span role="tooltip" className="pointer-events-none absolute top-full right-0 z-20 mt-2 hidden w-56 rounded-lg bg-slate-900 px-3 py-2 text-xs font-normal tracking-normal text-white normal-case shadow-lg group-hover:block group-focus-visible:block">
        {tip}
      </span>
    </span>
  )
}

/** '● N findings' in the card footer, only with open findings; opens the Review panel at this section. */
export function FindingsBadge({ sid }: { sid: SectionId }) {
  const findings = useReview((s) => s.findings)
  const design = useDesign((s) => s.design)
  const open = openInSection(sid, findings, design)
  if (!open.length) return null
  return (
    <button
      type="button"
      data-testid="findings-badge"
      onClick={() => openPanelAt(sid)}
      className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
    >
      <SeverityDot severity={worstSeverity(open)!} />
      {open.length} finding{open.length === 1 ? '' : 's'}
    </button>
  )
}

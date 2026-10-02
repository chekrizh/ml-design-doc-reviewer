import { useState } from 'react'
import { sectionName, type Finding as F, type Severity } from '@review/types.ts'
import { placement, STALE_LABEL } from '../model/review'
import { useDesign } from '../store/store'
import { changeStatus, useReview } from './store'

const DOT: Record<Severity, string> = {
  critical: 'h-2 w-2 rounded-full bg-red-600',
  major: 'h-2 w-2 rounded-full border-2 border-red-500',
  minor: 'h-2 w-2 rounded-full bg-slate-400',
}

/** Severity dot (docs/design-system.md 'Severity находки'). */
export const SeverityDot = ({ severity }: { severity: Severity }) => <span data-severity={severity} aria-hidden className={`inline-block shrink-0 ${DOT[severity]}`} />

const cap = (s: string) => s[0].toUpperCase() + s.slice(1)

/** Where a finding points: its field and the rubric dimension. */
export function findingWhere(f: F, withSection = false): string {
  if (f.anchor_kind === 'design' || !f.section) return f.dimension
  const field = withSection ? `${sectionName(f.section)} › ${f.anchor_label}` : f.anchor_label
  return `${field} · ${f.dimension}`
}

/**
 * One finding: title, severity, field and dimension; expanded, the evidence, why it matters,
 * the fix behind 'Show fix', and Dismiss / Resolve (Reopen when closed). Stale ones are faded with their label.
 */
export function FindingCard({ f, onExpand, withSection, comment }: { f: F; onExpand?: (f: F) => void; withSection?: boolean; comment?: boolean }) {
  const design = useDesign((s) => s.design)
  const expanded = useReview((s) => s.expanded === f.id)
  const [fix, setFix] = useState(false)
  const { stale } = placement(f, design)
  const where = stale === 'removed' ? `Field removed: ${f.anchor_label}` : findingWhere(f, withSection)
  const toggle = () => {
    useReview.setState({ expanded: expanded ? null : f.id })
    if (!expanded) onExpand?.(f)
  }
  return (
    <div
      data-testid={comment ? 'comment' : 'finding'}
      data-finding={f.id}
      className={`rounded-xl border px-3 py-2.5 ${comment ? `border-slate-200 bg-white ${expanded ? 'shadow-lg' : 'shadow-sm'}` : expanded ? 'border-slate-200 bg-white shadow-sm' : 'border-transparent hover:bg-slate-50'} ${stale ? 'opacity-70' : ''}`}
    >
      <button type="button" aria-expanded={expanded} onClick={toggle} className="flex w-full items-start gap-2.5 text-left">
        <span className="mt-1.5">
          <SeverityDot severity={f.severity} />
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block text-sm font-medium text-slate-900 ${expanded ? '' : 'line-clamp-2'}`}>{f.title}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
            <span>{cap(f.severity)}</span>
            <span>·</span>
            <span>{where}</span>
            {stale && <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[0.6875rem] font-medium text-slate-500">{STALE_LABEL[stale]}</span>}
          </span>
        </span>
      </button>
      {comment && !expanded && f.status === 'open' && <p className="mt-1.5 line-clamp-2 text-sm text-slate-500">{f.evidence}</p>}
      {expanded && (
        <div className="mt-3 flex flex-col gap-3 text-sm">
          <div>
            <div className="mb-0.5 text-xs tracking-wide text-slate-400 uppercase">What the design says</div>
            <p>{f.evidence}</p>
          </div>
          <div>
            <div className="mb-0.5 text-xs tracking-wide text-slate-400 uppercase">Why it matters</div>
            <p>{f.why}</p>
          </div>
          {fix ? (
            <div className="rounded-xl bg-indigo-50 px-3 py-2">
              <div className="mb-0.5 text-xs tracking-wide text-indigo-600 uppercase">Fix</div>
              <p className="text-slate-700">{f.fix}</p>
            </div>
          ) : (
            <button type="button" onClick={() => setFix(true)} className="self-start text-sm font-semibold text-indigo-600 hover:text-indigo-700">
              Show fix
            </button>
          )}
          {f.status === 'open' && (
            <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
              <button type="button" onClick={() => void changeStatus(f.id, 'dismissed')} className="ml-auto rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-slate-50">
                Dismiss
              </button>
              <button type="button" onClick={() => void changeStatus(f.id, 'resolved')} className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700">
                Resolve
              </button>
            </div>
          )}
        </div>
      )}
      {f.status !== 'open' && (
        <button type="button" onClick={() => void changeStatus(f.id, 'open')} className="mt-2 ml-[1.125rem] text-xs font-semibold text-indigo-600 hover:text-indigo-700">
          Reopen
        </button>
      )}
    </div>
  )
}

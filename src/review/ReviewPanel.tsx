import { useEffect, useState } from 'react'
import { errorText, ERRORS, type ErrorCode } from '@review/errors.ts'
import { sectionName, SEVERITIES, type Finding, type FindingStatus, type SectionId } from '@review/types.ts'
import { countBySeverity, groups, placement, withStatus } from '../model/review'
import { useDesign } from '../store/store'
import { formatEdited } from '../home/edited'
import { FindingCard, SeverityDot } from './Finding'
import { cancelReview, currentModel, openSettings, startReview, useReview, type Scope } from './store'

/** What the panel says under the error title (docs/mockups/review-run.html). */
const ERROR_DETAIL: Partial<Record<ErrorCode, string>> = {
  key_rejected: 'The key was deleted, disabled or mistyped.',
  no_credits: 'The key hit its spending limit or the account balance is empty. Top up or raise the limit at openrouter.ai, then run again.',
  provider_rate_limited: 'Too many requests in a short time. Wait a minute and run again.',
  model_unsupported: 'This model does not accept images. Choose another model in settings.',
  bad_output: 'It did not match the findings format. This happens now and then; run again or choose a stronger model.',
  timeout: 'Slow models can take longer on a large design. Run again, or review one section at a time.',
  provider_error: 'OpenRouter or the model did not respond. Run again in a minute.',
  review_in_progress: 'Another review of yours has not finished yet.',
  too_many_reviews: 'Try again later.',
}

const scopeName = (s: Scope) => (s === 'design' ? 'whole design' : sectionName(s))
const TABS: [FindingStatus, string][] = [
  ['open', 'Open'],
  ['resolved', 'Resolved'],
  ['dismissed', 'Dismissed'],
]

function Elapsed({ since }: { since: number }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const s = Math.max(0, Math.floor((now - since) / 1000))
  return <span className="text-indigo-600 tabular-nums">{`${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`}</span>
}

function Running() {
  const running = useReview((s) => s.running)!
  const models = useReview((s) => s.models)
  const model = useReview(currentModel)
  const name = models?.models.find((m) => m.id === model)?.name ?? model
  return (
    <div role="status" className="flex flex-col gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3">
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium text-indigo-700">Reviewing {scopeName(running.scope)}…</span>
        <Elapsed since={running.startedAt} />
        <button type="button" onClick={() => void cancelReview()} className="ml-auto text-sm font-semibold text-slate-600 hover:text-slate-900">
          Cancel
        </button>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-indigo-100">
        <div className="h-full w-2/5 animate-pulse rounded-full bg-indigo-400" />
      </div>
      <p className="text-xs text-indigo-700/80">
        {name} · usually 30–90 s. You can keep editing; fields you change now will be marked “changed since review”.
      </p>
    </div>
  )
}

function ErrorBlock() {
  const error = useReview((s) => s.error)!
  const models = useReview((s) => s.models)
  const name = models?.models.find((m) => m.id === error.model)?.name ?? error.model ?? 'This model'
  const action = ERRORS[error.code].action
  const act = () => (action === 'Run again' ? void startReview(error.scope) : openSettings())
  return (
    <div role="alert" className="flex flex-col gap-2 rounded-xl border border-red-200 bg-white px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="grid h-4 w-4 place-items-center rounded-full bg-red-600 text-[10px] font-bold text-white">!</span>
        <span className="text-sm font-medium text-slate-900">{errorText(error.code, name)}</span>
      </div>
      <p className="text-sm text-slate-600">
        {ERROR_DETAIL[error.code] ?? ''} Your previous findings are unchanged.
      </p>
      {action && (
        <div className="flex justify-end gap-2">
          <button type="button" onClick={act} className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700">
            {action}
          </button>
        </div>
      )}
    </div>
  )
}

/** Counts by severity (open findings) and the Open / Resolved / Dismissed tabs; shared with the editor and the document. */
export function StatusTabs({ findings }: { findings: Finding[] }) {
  const tab = useReview((s) => s.tab)
  return (
    <div role="tablist" aria-label="Finding status" className="flex gap-1 text-sm">
      {TABS.map(([status, label]) => (
        <button
          key={status}
          type="button"
          role="tab"
          aria-selected={tab === status}
          onClick={() => useReview.setState({ tab: status })}
          className={`rounded-lg px-2.5 py-1 ${tab === status ? 'bg-indigo-50 font-medium text-indigo-700' : 'text-slate-500 hover:bg-slate-100'}`}
        >
          {label} <span className="tabular-nums">{withStatus(findings, status).length}</span>
        </button>
      ))}
    </div>
  )
}

export function SeverityCounts({ findings }: { findings: Finding[] }) {
  const counts = countBySeverity(withStatus(findings, 'open'))
  return (
    <div data-testid="severity-counts" className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
      {SEVERITIES.map((s) => (
        <span key={s} data-count={s} className="flex items-center gap-1.5">
          <SeverityDot severity={s} />
          <span className="font-medium text-slate-900 tabular-nums">{counts[s]}</span> {s}
        </span>
      ))}
    </div>
  )
}

/** Shows the card of a finding's field and scrolls it into view. */
export function focusCard(f: Finding) {
  const section = placement(f, useDesign.getState().design).section
  useReview.setState({ highlight: section })
  if (section) document.querySelector(`[data-grid-item="${section}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
}

/** The Review panel on the canvas (docs/mockups/review-canvas.html, review-run.html). */
export function ReviewPanel() {
  const { findings, runs, running, error, tab, expanded } = useReview()
  const design = useDesign((s) => s.design)
  const [shownMinor, setShownMinor] = useState<Set<string>>(new Set())
  const last = runs.find((r) => r.status !== 'running')
  const subtitle = running
    ? `${running.scope === 'design' ? 'Whole design' : sectionName(running.scope)} · running`
    : error
      ? `${error.scope === 'design' ? 'Whole design' : sectionName(error.scope)} · failed just now`
      : last
        ? `${last.scope === 'design' ? 'Full design' : sectionName(last.scope)} · ${formatEdited(new Date(last.finished_at ?? last.started_at)).toLowerCase()}`
        : 'Not run yet'
  const list = groups(withStatus(findings, tab), design)
  return (
    <aside aria-label="Review" className="flex w-[420px] shrink-0 flex-col border-l border-slate-200 bg-white print:hidden">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-slate-900">Review</h2>
          <span className="text-xs text-slate-400">{subtitle}</span>
          {!running && last && (
            <button type="button" onClick={() => void startReview(last.scope)} className="ml-auto rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-900 hover:bg-slate-50">
              Run again
            </button>
          )}
          <button
            type="button"
            aria-label="Close review"
            onClick={() => useReview.setState({ panelOpen: false, highlight: null })}
            className={`${!running && last ? '' : 'ml-auto'} rounded-lg px-1.5 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700`}
          >
            ✕
          </button>
        </div>
        {running && <Running />}
        {error && !running && <ErrorBlock />}
        <SeverityCounts findings={findings} />
        <StatusTabs findings={findings} />
      </div>
      <div data-testid="review-findings" className={`min-h-0 flex-1 overflow-y-auto px-3 py-3 ${running ? 'opacity-50' : ''}`}>
        {list.length === 0 && <p className="px-3 py-8 text-center text-sm text-slate-400">{findings.length || runs.length ? 'Nothing here.' : 'Run a review from the AI Review menu.'}</p>}
        {list.map((g) => {
          const key = g.section ?? 'design'
          const main = tab === 'open' ? g.findings.filter((f) => f.severity !== 'minor') : g.findings
          const minors = tab === 'open' ? g.findings.filter((f) => f.severity === 'minor') : []
          const showMinor = !main.length || shownMinor.has(key) || minors.some((f) => f.id === expanded)
          return (
            <section key={key} id={`review-group-${key}`} aria-label={g.section ? sectionName(g.section as SectionId) : 'Whole design'} className="mb-4">
              <h3 className="sticky top-0 z-10 bg-white px-3 py-1.5 text-xs font-semibold tracking-wide text-slate-500 uppercase">{g.section ? sectionName(g.section) : 'Whole design'}</h3>
              <div className="flex flex-col gap-1">
                {main.map((f) => (
                  <FindingCard key={f.id} f={f} onExpand={focusCard} />
                ))}
                {showMinor
                  ? minors.map((f) => <FindingCard key={f.id} f={f} onExpand={focusCard} />)
                  : minors.length > 0 && (
                      <button type="button" onClick={() => setShownMinor(new Set(shownMinor).add(key))} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm text-slate-500 hover:bg-slate-50">
                        <SeverityDot severity="minor" />
                        {minors.length} minor — show
                      </button>
                    )}
              </div>
            </section>
          )
        })}
      </div>
    </aside>
  )
}

/** Opens the panel at a section (badge click): Open tab, its worst open finding expanded. */
export function openPanelAt(sid: SectionId) {
  const { findings } = useReview.getState()
  const design = useDesign.getState().design
  const first = findings.filter((f) => f.status === 'open' && placement(f, design).section === sid).sort((a, b) => SEVERITIES.indexOf(a.severity) - SEVERITIES.indexOf(b.severity))[0]
  useReview.setState({ panelOpen: true, tab: 'open', expanded: first?.id ?? null, highlight: sid })
  requestAnimationFrame(() => document.getElementById(`review-group-${sid}`)?.scrollIntoView({ block: 'start' }))
}

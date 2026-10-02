import type { AnchorKind, Finding, SectionId } from '@review/types.ts'
import { bySeverity, placement, withStatus } from '../model/review'
import { useDesign } from '../store/store'
import { formatEdited } from '../home/edited'
import { FindingCard, SeverityDot } from './Finding'
import { SeverityCounts, StatusTabs } from './ReviewPanel'
import { startReview, useReview } from './store'

/** The key of a finding's field in the editor and the document: 'kp:<id>', 'opt:<id>' or 'rationale'. */
export const fieldKey = (f: Pick<Finding, 'anchor_kind' | 'anchor_id'>) =>
  f.anchor_kind === 'key_property' ? `kp:${f.anchor_id}` : f.anchor_kind === 'tradeoff_option' ? `opt:${f.anchor_id}` : f.anchor_kind === 'rationale' ? 'rationale' : 'design'

/** Findings of one section, as placed now (a removed field's findings go to the whole design). */
export function useSectionFindings(sid: SectionId) {
  const findings = useReview((s) => s.findings)
  const design = useDesign((s) => s.design)
  return findings.filter((f) => placement(f, design).section === sid)
}

/** Shows a finding's field: highlighted and scrolled into view. */
export function focusField(f: Finding, root: ParentNode = document) {
  const key = fieldKey(f)
  useReview.setState({ fieldFocus: `${f.section}:${key}` })
  root.querySelector(`[data-field="${f.section}:${key}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
}

/** Marker dot next to a field with open findings; a click expands its worst finding. */
export function FieldMarker({ sid, kind, id }: { sid: SectionId; kind: AnchorKind; id: string | null }) {
  const findings = useSectionFindings(sid)
  const open = findings.filter((f) => f.status === 'open' && f.anchor_kind === kind && (kind === 'rationale' || f.anchor_id === id)).sort(bySeverity)
  if (!open.length) return null
  return (
    <button
      type="button"
      data-testid="field-marker"
      aria-label={`Finding: ${open[0].title}`}
      onClick={() => useReview.setState({ tab: 'open', expanded: open[0].id })}
      className="grid h-6 w-6 shrink-0 place-items-center rounded-full hover:bg-slate-100"
    >
      <SeverityDot severity={open[0].severity} />
    </button>
  )
}

/** Highlight ring for a field focused from a finding. */
export const useFieldFocus = (sid: SectionId, key: string) => useReview((s) => s.fieldFocus === `${sid}:${key}`)

/** The Findings column of the Component Editor (docs/mockups/review-editor.html). */
export function FindingsColumn({ sid }: { sid: SectionId }) {
  const findings = useSectionFindings(sid)
  const tab = useReview((s) => s.tab)
  const running = useReview((s) => s.running)
  const runs = useReview((s) => s.runs)
  const last = runs.find((r) => r.status === 'succeeded' && (r.scope === 'design' || r.scope === sid))
  const list = withStatus(findings, tab).sort(bySeverity)
  return (
    <aside aria-label="Findings" className="flex w-[360px] shrink-0 flex-col border-l border-slate-100">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-slate-900">Findings</h3>
          <button
            type="button"
            disabled={!!running}
            onClick={() => void startReview(sid)}
            className="ml-auto rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-900 hover:bg-slate-50 disabled:opacity-60"
          >
            {running && (running.scope === sid || running.scope === 'design') ? 'Reviewing…' : 'Review this section'}
          </button>
        </div>
        <p className="-mt-2 text-xs text-slate-400">
          {last ? `${last.scope === 'design' ? 'Full design' : 'Section'} review · ${formatEdited(new Date(last.finished_at ?? last.started_at)).toLowerCase()}` : 'Not reviewed yet'}
        </p>
        <SeverityCounts findings={findings} />
        <StatusTabs findings={findings} />
      </div>
      <div className="flex flex-col gap-1 px-3 py-3">
        {list.length ? list.map((f) => <FindingCard key={f.id} f={f} onExpand={(x) => focusField(x)} />) : <p className="px-3 py-6 text-center text-sm text-slate-400">Nothing here.</p>}
      </div>
    </aside>
  )
}

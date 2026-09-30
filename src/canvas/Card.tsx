import { sectionName, type SectionId } from '../model/design'
import { diagramNonEmpty, tradeoffsComplete } from '../model/rules'
import { InlineText } from '../editor/InlineText'
import { useDiagramImage } from '../export/svg'
import { useDesign, useSection } from '../store/store'
import { SectionIcon } from './SectionIcon'

const MAX_PROPS = 4

function Indicator({ label, on }: { label: string; on: boolean }) {
  return (
    <span
      role="status"
      aria-label={`${label} ${on ? 'filled' : 'not filled'}`}
      data-indicator={label}
      data-state={on ? 'on' : 'off'}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium select-none ${on ? 'bg-violet-100 text-violet-700' : 'bg-slate-50 text-slate-300'}`}
    >
      {label}
    </span>
  )
}

export function Card({ sid, onDetails }: { sid: SectionId; onDetails: () => void }) {
  const section = useSection(sid)
  const update = useDesign((s) => s.updateKeyProperty)
  const thumb = useDiagramImage(section.diagram)
  const shown = section.keyProperties.slice(0, MAX_PROPS)
  const hidden = section.keyProperties.length - shown.length
  const hasDiagram = diagramNonEmpty(section.diagram)

  return (
    <article data-testid={`card-${sid}`} aria-label={sectionName(sid)} className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="card-drag flex cursor-move items-center gap-3 border-b border-slate-100 px-4 py-3">
        <SectionIcon id={sid} className="h-5 w-5 text-slate-700" />
        <h2 className="text-sm font-semibold tracking-wide uppercase">{sectionName(sid)}</h2>
      </header>
      <div className="flex min-h-0 flex-1 gap-4 overflow-hidden px-4 py-3">
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
          <div data-testid="thumbnail" className="flex max-w-[60%] min-w-0 flex-1 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 p-2">
            {thumb && <img src={thumb} alt={`${sectionName(sid)} diagram`} className="max-h-full max-w-full object-contain" />}
          </div>
        )}
      </div>
      <footer className="flex items-center gap-2 border-t border-slate-100 px-4 py-3">
        <button type="button" onClick={onDetails} className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700">
          Details
        </button>
        <Indicator label="Trade-offs" on={tradeoffsComplete(section.tradeoffs)} />
      </footer>
    </article>
  )
}

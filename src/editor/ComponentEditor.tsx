import { lazy, Suspense } from 'react'
import { sectionName, type SectionId } from '../model/design'
import { SectionIcon } from '../canvas/SectionIcon'
import { useDesign, useSection } from '../store/store'
import { RichTextEditor } from './RichTextEditor'
import { TradeoffMatrix } from './TradeoffMatrix'

const Whiteboard = lazy(() => import('./Whiteboard'))

const field = 'w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-indigo-400'

function Part({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section aria-label={title} className="border-b border-slate-100 py-6 last:border-0">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  )
}

/** Deep-dive modal for one section: decisions, rationale, trade-offs and whiteboard. */
export function ComponentEditor({ sid, onClose }: { sid: SectionId; onClose: () => void }) {
  const section = useSection(sid)
  const saveState = useDesign((s) => s.saveState)
  const a = useDesign.getState()
  const name = sectionName(sid)

  return (
    <div
      data-testid="editor-overlay"
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/30 p-8"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && !(e.target as HTMLElement).closest('[data-testid="whiteboard"]')) onClose()
      }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="editor-title" className="w-full max-w-5xl rounded-3xl bg-white shadow-2xl">
        <header className="flex items-center gap-4 border-b border-slate-100 px-8 py-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
            <SectionIcon id={sid} />
          </div>
          <h2 id="editor-title" className="flex-1 text-2xl font-semibold">{name}</h2>
          <span data-testid="save-state" className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-500">
            {{ saved: '☁ Saved to Canvas', saving: 'Saving…', error: 'Not saved' }[saveState]}
          </span>
          <button type="button" aria-label="Close" onClick={onClose} autoFocus className="rounded-full p-2 text-2xl leading-none text-slate-500 hover:bg-slate-100">
            ×
          </button>
        </header>
        <div className="px-8">
          <Part
            title="Decisions & Properties"
            action={
              <button type="button" onClick={() => a.addKeyProperty(sid)} className="text-sm font-semibold text-indigo-700">
                + Add Property
              </button>
            }
          >
            <div className="space-y-3">
              {section.keyProperties.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3">
                  <input aria-label={`Property ${i + 1} key`} placeholder="Key" value={p.key} onChange={(e) => a.updateKeyProperty(sid, p.id, { key: e.target.value })} className={`${field} max-w-xs`} />
                  <span className="text-slate-400">:</span>
                  <input aria-label={`Property ${i + 1} value`} placeholder="Value" value={p.value} onChange={(e) => a.updateKeyProperty(sid, p.id, { value: e.target.value })} className={field} />
                  <button type="button" aria-label={`Delete property ${i + 1}`} onClick={() => a.removeKeyProperty(sid, p.id)} className="px-2 text-slate-400 hover:text-red-500">
                    🗑
                  </button>
                </div>
              ))}
            </div>
          </Part>
          <Part title="Rationale & Notes">
            <RichTextEditor label="Rationale" value={section.rationale} onChange={(v) => a.setRationale(sid, v)} />
          </Part>
          <Part title="Trade-off Matrix">
            <p className="-mt-3 mb-3 text-sm text-slate-500">Compare technical approaches against key criteria.</p>
            <TradeoffMatrix sid={sid} />
          </Part>
          <Part title="Whiteboard">
            <Suspense fallback={<div className="h-[420px] animate-pulse rounded-xl bg-slate-50" />}>
              <Whiteboard sid={sid} />
            </Suspense>
          </Part>
        </div>
      </div>
    </div>
  )
}

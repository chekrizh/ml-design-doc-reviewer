import { lazy, Suspense } from 'react'
import { sectionName, type SectionId } from '../model/design'
import { SectionIcon } from '../canvas/SectionIcon'
import { useDesign, useSection } from '../store/store'
import { RichTextEditor } from './RichTextEditor'
import { TradeoffMatrix } from './TradeoffMatrix'
import { useAuth } from '../backend/auth'
import { ReviewIndicator } from '../review/CardSignals'
import { FieldMarker, FindingsColumn } from '../review/EditorFindings'
import { useReview } from '../review/store'

const Whiteboard = lazy(() => import('./Whiteboard'))

const field = 'w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-indigo-400'

function Part({ title, children, action, marker, field, focused }: { title: string; children: React.ReactNode; action?: React.ReactNode; marker?: React.ReactNode; field?: string; focused?: boolean }) {
  return (
    <section aria-label={title} className="border-b border-slate-100 py-6 last:border-0">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 data-field={field} className={`text-lg font-semibold ${focused ? 'rounded-lg outline-2 outline-offset-4 outline-indigo-300' : ''}`}>
            {title}
          </h3>
          {marker}
        </div>
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
  const signedIn = useAuth((s) => !!s.account)
  const focus = useReview((s) => (s.fieldFocus?.startsWith(`${sid}:`) ? s.fieldFocus.slice(sid.length + 1) : null))

  return (
    <div
      data-testid="editor-overlay"
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/30 p-2 sm:p-8"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && !(e.target as HTMLElement).closest('[data-testid="whiteboard"]')) onClose()
      }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="editor-title" className={`w-full ${signedIn ? 'max-w-7xl' : 'max-w-5xl'} rounded-2xl bg-white shadow-2xl sm:rounded-3xl`}>
        <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-100 px-4 py-4 sm:px-8 sm:py-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
            <SectionIcon id={sid} />
          </div>
          <h2 id="editor-title" className="min-w-0 text-xl font-semibold sm:text-2xl">{name}</h2>
          {signedIn && <ReviewIndicator sid={sid} />}
          <span className="flex-1" />
          <span data-testid="save-state" className="rounded-full border border-slate-200 px-3 py-1 text-sm whitespace-nowrap text-slate-500 max-sm:order-last">
            {{ saved: '☁ Saved to Canvas', saving: 'Saving…', error: 'Not saved' }[saveState]}
          </span>
          <button type="button" aria-label="Close" onClick={onClose} autoFocus className="rounded-full p-2 text-2xl leading-none text-slate-500 hover:bg-slate-100">
            ×
          </button>
        </header>
        <div className="flex flex-col lg:flex-row lg:items-stretch">
        <div className="min-w-0 flex-1 px-4 sm:px-8">
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
                <div key={p.id} data-field={`${sid}:kp:${p.id}`} className={`flex flex-wrap items-center gap-2 rounded-3xl sm:flex-nowrap sm:gap-3 sm:rounded-full ${focus === `kp:${p.id}` ? 'outline-2 outline-offset-2 outline-indigo-300' : ''}`}>
                  <input aria-label={`Property ${i + 1} key`} placeholder="Key" value={p.key} onChange={(e) => a.updateKeyProperty(sid, p.id, { key: e.target.value })} className={`${field} sm:max-w-xs`} />
                  <span className="text-slate-400 max-sm:hidden">:</span>
                  <input aria-label={`Property ${i + 1} value`} placeholder="Value" value={p.value} onChange={(e) => a.updateKeyProperty(sid, p.id, { value: e.target.value })} className={`${field} max-sm:flex-1 max-sm:basis-0`} />
                  {signedIn && <FieldMarker sid={sid} kind="key_property" id={p.id} />}
                  <button type="button" aria-label={`Delete property ${i + 1}`} onClick={() => a.removeKeyProperty(sid, p.id)} className="px-2 text-slate-400 hover:text-red-500">
                    🗑
                  </button>
                </div>
              ))}
            </div>
          </Part>
          <Part title="Rationale & Notes" field={`${sid}:rationale`} focused={focus === 'rationale'} marker={signedIn && <FieldMarker sid={sid} kind="rationale" id={null} />}>
            <RichTextEditor label="Rationale" value={section.rationale} onChange={(v) => a.setRationale(sid, v)} />
          </Part>
          <Part title="Trade-off Matrix">
            <p className="-mt-3 mb-3 text-sm text-slate-500">Compare technical approaches against key criteria.</p>
            <TradeoffMatrix sid={sid} focused={focus} marker={signedIn ? (id) => <FieldMarker sid={sid} kind="tradeoff_option" id={id} /> : undefined} />
          </Part>
          <Part title="Whiteboard">
            <Suspense fallback={<div className="h-[min(26rem,60dvh)] animate-pulse rounded-xl bg-slate-50" />}>
              <Whiteboard sid={sid} />
            </Suspense>
          </Part>
        </div>
        {signedIn && <FindingsColumn sid={sid} />}
        </div>
      </div>
    </div>
  )
}

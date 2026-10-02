import { useEffect, useState, type ReactNode } from 'react'
import { SECTIONS, type SectionId } from '../model/design'
import { diagramNonEmpty, sectionEmpty } from '../model/rules'
import { InlineText } from '../editor/InlineText'
import { RichTextEditor } from '../editor/RichTextEditor'
import { TradeoffMatrix } from '../editor/TradeoffMatrix'
import { useDiagramImage } from '../export/svg'
import { useDesign, useSection } from '../store/store'

export const docAnchor = (sid: SectionId) => `doc-${sid}`

function DocSection({ sid, n, name }: { sid: SectionId; n: number; name: string }) {
  const s = useSection(sid)
  const a = useDesign.getState()
  const img = useDiagramImage(s.diagram)
  const empty = sectionEmpty(s)
  const hasValues = s.keyProperties.some((p) => p.value.trim())

  return (
    <section id={docAnchor(sid)} data-testid={`doc-section-${sid}`} aria-labelledby={`${docAnchor(sid)}-h`} className="scroll-mt-24 pb-10">
      <h2 id={`${docAnchor(sid)}-h`} className="mb-5 border-b border-slate-100 pb-3 text-2xl font-semibold">
        {n}. {name}
      </h2>
      <div className="space-y-6">
        {hasValues && (
          <dl data-testid="key-properties" className="flex flex-wrap gap-x-8 gap-y-3 rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 break-inside-avoid">
            {s.keyProperties.map((p) => (
              <div key={p.id} data-field={`${sid}:kp:${p.id}`} className="min-w-0 rounded-lg">
                <dt className="text-xs font-medium tracking-wide text-slate-400 uppercase">{p.key}</dt>
                <dd className="flex">
                  <InlineText label={p.key || 'value'} value={p.value} placeholder="—" onSave={(value) => a.updateKeyProperty(sid, p.id, { value })} />
                </dd>
              </div>
            ))}
          </dl>
        )}
        {/* Free text of the section, also for empty sections: it is the section's Rationale & Notes. */}
        <div data-testid="rationale" data-field={`${sid}:rationale`} className="rounded-lg leading-relaxed text-slate-700">
          <RichTextEditor
            bare
            label={`${name} rationale`}
            placeholder={empty ? 'Not filled yet — start typing…' : 'Add rationale & notes…'}
            value={s.rationale}
            onChange={(v) => a.setRationale(sid, v)}
          />
        </div>
        {s.tradeoffs.options.length > 0 && (
          <div data-testid="doc-matrix" className="break-inside-avoid">
            <h3 className="mb-3 text-sm font-semibold">Trade-off Matrix</h3>
            <TradeoffMatrix sid={sid} editable={false} />
          </div>
        )}
        {diagramNonEmpty(s.diagram) && img && (
          <img src={img} alt={`${name} diagram`} className="mx-auto max-h-96 max-w-full break-inside-avoid" />
        )}
      </div>
    </section>
  )
}

function useActiveSection() {
  const [active, setActive] = useState<SectionId>(SECTIONS[0].id)
  useEffect(() => {
    const onScroll = () => {
      let current = SECTIONS[0].id
      for (const s of SECTIONS) {
        const el = document.getElementById(docAnchor(s.id))
        if (el && el.getBoundingClientRect().top <= 120) current = s.id
      }
      // At the bottom of the page the last sections can never reach the top.
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) current = SECTIONS.at(-1)!.id
      setActive(current)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return [active, setActive] as const
}

export function DocumentView({ comments }: { comments?: ReactNode }) {
  const title = useDesign((s) => s.design.title)
  const updatedAt = useDesign((s) => s.design.updatedAt)
  const setTitle = useDesign((s) => s.setTitle)
  const [active, setActive] = useActiveSection()

  // Outline left, sheet, comments right (Google Docs-like, M2), with or without a review.
  // Below xl: the sheet alone, the comments listed under it.
  return (
    <main className="mx-auto grid max-w-360 gap-8 px-4 py-6 sm:px-6 sm:py-8 xl:grid-cols-[14rem_minmax(0,1fr)_20rem] print:block print:p-0">
      <nav aria-label="On this page" className="sticky top-24 self-start max-xl:hidden print:hidden">
        <h2 className="mb-3 text-xs font-semibold tracking-wide text-slate-400 uppercase">On this page</h2>
        <ul className="space-y-1">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a
                href={`#${docAnchor(s.id)}`}
                aria-current={active === s.id ? 'location' : undefined}
                onClick={(e) => {
                  e.preventDefault()
                  document.getElementById(docAnchor(s.id))?.scrollIntoView()
                  setActive(s.id)
                }}
                className={`block rounded-lg px-3 py-2 text-sm ${active === s.id ? 'bg-indigo-100 font-medium text-indigo-700' : 'text-slate-500 hover:text-slate-800'}`}
              >
                {s.name}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <article data-testid="document" className="min-w-0 rounded-3xl bg-white px-5 py-8 shadow-sm sm:px-10 sm:py-10 lg:px-16 lg:py-14 print:rounded-none print:p-0 print:shadow-none">
        <h1 data-field="design" className="flex text-3xl font-bold tracking-tight sm:text-5xl">
          <InlineText label="Document title" value={title} placeholder="Untitled design" onSave={setTitle} maxLength={200} className="w-full" inputClassName="w-full" wrap />
        </h1>
        <p className="mt-2 text-lg text-slate-500 sm:text-xl">ML System Architecture Spec</p>
        <p className="mt-2 mb-12 text-sm text-slate-400">
          Last updated: {new Date(updatedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
        </p>
        {SECTIONS.map((s, i) => (
          <DocSection key={s.id} sid={s.id} n={i + 1} name={s.name} />
        ))}
      </article>
      <aside aria-label="Comments" data-testid="comments" className="print:hidden">
        {comments}
      </aside>
    </main>
  )
}

import { useEffect, useState } from 'react'
import { SECTIONS, type SectionId } from '../model/design'
import { diagramNonEmpty, richTextEmpty, sectionEmpty } from '../model/rules'
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
      {empty ? (
        <p className="text-slate-400 italic">Not filled yet</p>
      ) : (
        <div className="space-y-6">
          {hasValues && (
            <dl data-testid="key-properties" className="flex flex-wrap gap-x-8 gap-y-3 rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 break-inside-avoid">
              {s.keyProperties.map((p) => (
                <div key={p.id} className="min-w-0">
                  <dt className="text-xs font-medium tracking-wide text-slate-400 uppercase">{p.key}</dt>
                  <dd className="flex">
                    <InlineText label={p.key || 'value'} value={p.value} placeholder="—" onSave={(value) => a.updateKeyProperty(sid, p.id, { value })} />
                  </dd>
                </div>
              ))}
            </dl>
          )}
          {!richTextEmpty(s.rationale) && (
            <div data-testid="rationale" className="leading-relaxed text-slate-700">
              <RichTextEditor bare label={`${name} rationale`} value={s.rationale} onChange={(v) => a.setRationale(sid, v)} />
            </div>
          )}
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
      )}
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

export function DocumentView() {
  const title = useDesign((s) => s.design.title)
  const updatedAt = useDesign((s) => s.design.updatedAt)
  const [active, setActive] = useActiveSection()

  return (
    <main className="mx-auto flex max-w-6xl gap-10 px-6 py-8 print:block print:p-0">
      <article data-testid="document" className="min-w-0 flex-1 rounded-3xl bg-white px-16 py-14 shadow-sm print:rounded-none print:p-0 print:shadow-none">
        <h1 className="text-5xl font-bold tracking-tight">{title || 'Untitled design'}</h1>
        <p className="mt-2 text-xl text-slate-500">ML System Architecture Spec</p>
        <p className="mt-2 mb-12 text-sm text-slate-400">
          Last updated: {new Date(updatedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
        </p>
        {SECTIONS.map((s, i) => (
          <DocSection key={s.id} sid={s.id} n={i + 1} name={s.name} />
        ))}
      </article>
      <nav aria-label="On this page" className="sticky top-24 hidden w-64 shrink-0 self-start lg:block print:hidden">
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
                className={`block rounded-lg px-3 py-2 text-sm ${active === s.id ? 'bg-violet-100 font-medium text-violet-700' : 'text-slate-500 hover:text-slate-800'}`}
              >
                {s.name}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </main>
  )
}

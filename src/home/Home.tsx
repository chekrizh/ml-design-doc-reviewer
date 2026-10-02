import { useEffect, useState, type ReactNode } from 'react'
import { signInWithGoogle, useAuth } from '../backend/auth'
import { createDesign, deleteDesign, listDesigns, type DesignRow, type Origin } from '../backend/designs'
import { Account } from '../canvas/Account'
import { Menu, MenuItem } from '../canvas/Menu'
import { alertDialog, confirmDialog } from '../dialogs'
import { LIBRARY, libraryDesign, type LibraryItem } from '../fixtures/library'
import { emptyDesign, INITIAL_LAYOUT, type Design, type SectionId } from '../model/design'
import { tradeoffsComplete, diagramNonEmpty } from '../model/rules'
import { designHasContent, designSummary, type DesignSummary } from '../model/summary'
import { navigate } from '../router'
import { loadLocal, replaceLocal } from '../store/persist'
import { formatEdited } from './edited'

const primary = 'shrink-0 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700'
const CHIP: Record<Origin, [string, string]> = {
  blank: ['Blank', 'bg-slate-100 text-slate-600'],
  task: ['Task', 'bg-indigo-50 text-indigo-700'],
  example: ['Example', 'bg-emerald-50 text-emerald-700'],
}
const TASK_TEXT: Record<string, string> = {
  'superpay-fraud-detection': 'Replace a rule engine with fraud scoring in under 200 ms.',
}

const Chip = ({ origin }: { origin: Origin }) => (
  <span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${CHIP[origin][1]}`}>{CHIP[origin][0]}</span>
)

/** Main screen (docs/mockups/home.html): galleries in one row, 'Your designs' fills the rest and scrolls inside. */
export function Home() {
  const account = useAuth((s) => s.account)
  const ready = useAuth((s) => s.ready)
  // From lg the page fits the window and only the list scrolls; narrower, the whole page scrolls.
  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh">
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 sm:px-6">
        <div className="flex h-14 items-center gap-3">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-900 text-white">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <rect x="1.5" y="1.5" width="5" height="5" rx="1" />
              <rect x="9.5" y="9.5" width="5" height="5" rx="1" />
              <path d="M4 6.5v5.5h5.5" />
            </svg>
          </div>
          <span className="truncate font-semibold text-slate-900">ML System Design Trainer</span>
          <div className="ml-auto flex items-center gap-2">
            <Account />
          </div>
        </div>
      </header>
      <main className="flex min-h-0 w-full flex-1 flex-col gap-6 px-4 py-5 sm:px-6">
        <div className="grid shrink-0 gap-6 lg:grid-cols-[fit-content(66%)_fit-content(34%)] lg:justify-start lg:gap-10">
          <Gallery title="Design a system" text="Start empty or take a task with the problem already set.">
            <BlankCard />
            {LIBRARY.filter((i) => i.kind === 'task').map((i) => (
              <ItemCard key={i.id} item={i} />
            ))}
          </Gallery>
          <Gallery title="Examples" text="Complete designs to read and change.">
            {LIBRARY.filter((i) => i.kind === 'example').map((i) => (
              <ItemCard key={i.id} item={i} />
            ))}
          </Gallery>
        </div>
        {ready && (account ? <YourDesigns /> : <GuestDesigns />)}
      </main>
    </div>
  )
}

function Gallery({ title, text, children }: { title: string; text: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex min-w-0 flex-col gap-3">
      <div>
        <h2 className="font-semibold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-500">{text}</p>
      </div>
      <div className="flex snap-x gap-4 overflow-x-auto pb-1">{children}</div>
    </section>
  )
}

/** Opens a new design: in the account when signed in, else in this browser (asking before replacing work). */
async function start(design: Design, origin: Origin, sourceId: string | null, cta: string, what: string) {
  if (useAuth.getState().account) {
    if (origin === 'example') return navigate(`/library/${sourceId}`)
    try {
      navigate(`/d/${await createDesign(design, origin, sourceId)}`)
    } catch {
      await alertDialog('The design could not be created. Please try again.')
    }
    return
  }
  const current = await loadLocal()
  if (current && designHasContent(current.design)) {
    const name = current.design.title.trim() || 'Untitled design'
    const ok = await confirmDialog(`“${name}” in this browser will be replaced by ${what}. Sign in to keep both.`, cta, 'Replace your current work?')
    if (!ok) return
  }
  await replaceLocal(design, origin, sourceId)
  navigate('/local')
}

function Card({ preview, origin, title, text, source, cta, onClick }: { preview: [string, string, boolean?][]; origin: Origin; title: string; text: string; source?: ReactNode; cta: string; onClick: () => void }) {
  return (
    <article aria-label={title} className="flex w-72 max-w-[85vw] shrink-0 snap-start flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
        <div className="mb-1.5 text-[0.625rem] font-semibold tracking-wide text-slate-500 uppercase">Problem Space</div>
        <dl className="flex flex-col gap-0.5 text-xs">
          {preview.map(([k, v, accent]) => (
            <div key={k} className="flex gap-2">
              <dt className="w-16 shrink-0 text-slate-400">{k}</dt>
              <dd className={`min-w-0 truncate ${v ? (accent ? 'font-medium text-indigo-600' : 'text-slate-700') : 'text-slate-300'}`}>{v || '—'}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="flex flex-1 flex-col gap-1 px-1">
        <h3 className="leading-snug font-semibold text-balance text-slate-900">{title}</h3>
        <p className="text-sm text-slate-500">{text}</p>
        {source}
      </div>
      <div className="flex items-center gap-2 px-1">
        <Chip origin={origin} />
        <button type="button" className={`ml-auto ${primary}`} onClick={onClick}>
          {cta}
        </button>
      </div>
    </article>
  )
}

function BlankCard() {
  return (
    <Card
      preview={[['Domain', ''], ['Goal', ''], ['Constraints', ''], ['ML Task', '']]}
      origin="blank"
      title="Your own problem"
      text="Describe the problem, then make every decision yourself."
      cta="New design"
      onClick={() => void start(emptyDesign(), 'blank', null, 'New design', 'a new design')}
    />
  )
}

function ItemCard({ item }: { item: LibraryItem }) {
  const design = libraryDesign(item.id)
  const value = (key: string) => design.sections[0].keyProperties.find((p) => p.key === key)?.value ?? ''
  const mlTask = value('ML Task')
  const example = item.kind === 'example'
  const text = example
    ? `A complete design with ${design.sections.filter((s) => tradeoffsComplete(s.tradeoffs)).length} trade-off matrices and ${design.sections.filter((s) => diagramNonEmpty(s.diagram)).length} diagrams.`
    : (TASK_TEXT[item.id] ?? '')
  // 'ML System Design by Kravchenko and Babushkin, MIT License.' → 'ML System Design · MIT'
  const license = item.source.note.match(/(\S+) License/)?.[1]
  const short = [item.source.note.split(/ by |,/)[0], license].filter(Boolean).join(' · ')
  return (
    <Card
      preview={[['Domain', value('Domain')], ['Goal', value('Business Goal')], ['Constraints', value('Constraints')], mlTask ? ['ML Task', mlTask] : ['ML Task', 'Your first decision', true]]}
      origin={item.kind}
      title={item.title}
      text={text}
      source={
        example && (
          <p className="text-xs text-slate-400">
            Source:{' '}
            {item.source.url ? (
              <a href={item.source.url} target="_blank" rel="noreferrer" className="hover:text-slate-700">
                {short || item.source.label}
              </a>
            ) : (
              short || item.source.label
            )}
          </p>
        )
      }
      cta={example ? 'Open example' : 'Start task'}
      onClick={() => void start(design, item.kind, item.id, example ? 'Open example' : 'Start task', example ? 'the example' : 'the task')}
    />
  )
}

const ORDER = INITIAL_LAYOUT.map((l) => [l.i, l.w] as [SectionId, number])

/** The design's section map in the canvas layout, filled vs empty. */
function SectionMap({ filled }: { filled: SectionId[] }) {
  return (
    <div aria-hidden className="grid h-9 w-12 shrink-0 grid-cols-12 grid-rows-3 gap-0.5">
      {ORDER.map(([id, w]) => (
        <div
          key={id}
          data-filled={filled.includes(id)}
          style={{ gridColumn: `span ${w}` }}
          className={`rounded-xs ${filled.includes(id) ? 'border border-slate-200 bg-slate-200' : 'border border-dashed border-slate-300'}`}
        />
      ))}
    </div>
  )
}

function Row({ title, summary, origin, openFindings, edited, onOpen, action }: { title: string; summary: DesignSummary; origin?: Origin; openFindings?: number; edited: Date; onOpen: () => void; action: ReactNode }) {
  const name = title.trim() || 'Untitled design'
  return (
    <div data-testid="design-row" className="flex items-center gap-3 px-4 py-3 sm:gap-4 hover:bg-slate-50">
      <button type="button" className="flex min-w-0 flex-1 items-center gap-4 text-left" onClick={onOpen} aria-label={`Open ${name}`}>
        <SectionMap filled={summary.filledSections} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-medium text-slate-900">{name}</span>
            {origin && <Chip origin={origin} />}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
            <span className={summary.mlTask ? '' : 'text-slate-400'}>{summary.mlTask || 'ML Task not chosen'}</span>
            <span className="tabular-nums">{summary.filledSections.length} / 9 sections</span>
            {summary.tradeoffs > 0 && <span className="tabular-nums">{summary.tradeoffs} trade-offs</span>}
            {!!openFindings && (
              <span className="flex items-center gap-1 text-red-600">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                {openFindings} open finding{openFindings === 1 ? '' : 's'}
              </span>
            )}
          </div>
        </div>
      </button>
      <span className="shrink-0 text-xs text-slate-400 max-sm:hidden">{formatEdited(edited)}</span>
      {action}
    </div>
  )
}

function YourDesigns() {
  const [rows, setRows] = useState<DesignRow[] | null>(null)
  const [failed, setFailed] = useState(false)
  const load = () =>
    listDesigns().then(
      (r) => setRows(r),
      () => setFailed(true),
    )
  useEffect(() => {
    void load()
  }, [])
  const remove = async (r: DesignRow) => {
    if (!(await confirmDialog(`Delete “${r.title.trim() || 'Untitled design'}”? It is removed for good, with its reviews.`, 'Delete'))) return
    try {
      await deleteDesign(r.id)
    } catch {
      await alertDialog('The design could not be deleted. Please try again.')
    }
    await load()
  }
  return (
    <section aria-label="Your designs" className="flex min-h-0 flex-1 flex-col gap-3">
      <div>
        <h2 className="font-semibold text-slate-900">Your designs</h2>
        <p className="text-sm text-slate-500">Saved to your account. Last edited first.</p>
      </div>
      {failed ? (
        <p className="text-sm text-red-600">Your designs could not be loaded. Reload the page to try again.</p>
      ) : rows?.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
          No designs yet. Start with <span className="font-medium text-slate-700">New design</span>, a task or an example above.
        </div>
      ) : (
        rows && (
          <div className="min-h-0 divide-y divide-slate-100 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            {rows.map((r) => (
              <Row
                key={r.id}
                title={r.title}
                summary={r.summary}
                origin={r.origin}
                openFindings={r.openFindings}
                edited={new Date(r.updated_at)}
                onOpen={() => navigate(`/d/${r.id}`)}
                action={
                  <Menu label="More actions" button="⋯" className="shrink-0 rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                    <MenuItem onClick={() => void remove(r)}>Delete</MenuItem>
                  </Menu>
                }
              />
            ))}
          </div>
        )
      )}
    </section>
  )
}

function GuestDesigns() {
  const [local, setLocal] = useState<Design | null>(null)
  useEffect(() => {
    void loadLocal().then((l) => setLocal(l && designHasContent(l.design) ? l.design : null))
  }, [])
  return (
    <section aria-label="Your designs" className="flex min-h-0 flex-1 flex-col gap-3">
      <h2 className="font-semibold text-slate-900">Your designs</h2>
      {local && (
        <div data-testid="current-work" className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="px-4 pt-3 text-xs tracking-wide text-slate-400 uppercase">Current work · in this browser</div>
          <Row
            title={local.title}
            summary={designSummary(local)}
            edited={new Date(local.updatedAt)}
            onOpen={() => navigate('/local')}
            action={
              <button type="button" className={primary} onClick={() => navigate('/local')}>
                Continue
              </button>
            }
          />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-dashed border-slate-300 bg-slate-100/60 px-4 py-3">
        <p className="min-w-0 flex-1 text-sm text-slate-500">
          <span className="font-medium text-slate-700">Sign in to keep several designs and run AI review.</span> Your current work moves to your account.
        </p>
        <button type="button" className={primary} onClick={() => void signInWithGoogle()}>
          Sign in with Google
        </button>
      </div>
    </section>
  )
}

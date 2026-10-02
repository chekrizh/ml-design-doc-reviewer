import { exampleDesign } from '../fixtures/example'
import { emptyDesign } from '../model/design'
import { InlineText } from '../editor/InlineText'
import { confirmEmptySections, exportMarkdown } from '../export/download'
import { diagramToSvg } from '../export/svg'
import { alertDialog, confirmDialog } from '../dialogs'
import { diagramNonEmpty } from '../model/rules'
import { useDesign } from '../store/store'
import { navigate } from '../router'
import { Account } from './Account'
import { ReviewMenu } from '../review/ReviewMenu'
import type { SectionId } from '../model/design'
import { Menu, MenuItem } from './Menu'

export type Mode = 'canvas' | 'document'

const SAVE_LABEL = { saved: 'Saved', saving: 'Saving…', error: 'Not saved' }

const tab = (on: boolean) =>
  `rounded-lg px-4 py-1.5 text-sm font-medium ${on ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`
const action = 'shrink-0 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-50'

export function Header({ mode, setMode, onReview, lastRunAt }: { mode: Mode; setMode: (m: Mode) => void; onReview?: (scope: 'design' | SectionId) => void; lastRunAt?: string | null }) {
  const title = useDesign((s) => s.design.title)
  const saveState = useDesign((s) => s.saveState)
  const a = useDesign.getState()

  const loadExample = async () => {
    if (await confirmDialog('Load the example design? It replaces your current design.', 'Load example'))
      a.setDesign(exampleDesign())
  }
  const clearDesign = async () => {
    if (await confirmDialog('Clear the design? Everything on the canvas and in the document is removed.', 'Clear design'))
      a.setDesign(emptyDesign())
  }
  const exportMd = async () => {
    const d = useDesign.getState().design
    if (await confirmEmptySections(d))
      exportMarkdown(d).catch(() => alertDialog('Export failed: a diagram could not be rendered. Please try again.'))
  }
  const exportPdf = async () => {
    const d = useDesign.getState().design
    if (!(await confirmEmptySections(d))) return
    // Render the diagrams first: the Excalidraw chunk is large and loads lazily.
    try {
      await Promise.all(d.sections.filter((s) => diagramNonEmpty(s.diagram)).map((s) => diagramToSvg(s.diagram)))
    } catch {
      await alertDialog('Some diagrams could not be rendered and will be missing from the PDF.')
    }
    setMode('document')
    // Let the document render its (now cached) diagram images before printing.
    setTimeout(() => window.print(), 300)
  }

  return (
    <header className="sticky top-0 z-40 flex items-center gap-4 border-b border-slate-200 bg-white/90 px-6 py-3 backdrop-blur print:hidden">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <a
          href="/"
          aria-label="ML System Design Trainer: home"
          onClick={(e) => {
            e.preventDefault()
            navigate('/')
          }}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white"
        >
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <rect x="1.5" y="1.5" width="5" height="5" rx="1" />
            <rect x="9.5" y="9.5" width="5" height="5" rx="1" />
            <path d="M4 6.5v5.5h5.5" />
          </svg>
        </a>
        <h1 className="flex min-w-0 text-lg font-semibold">
          <InlineText label="Design title" value={title} placeholder="Untitled design" onSave={a.setTitle} inputClassName="w-80" />
        </h1>
        <span data-testid="header-save-state" className={`shrink-0 text-xs ${saveState === 'error' ? 'font-medium text-red-600' : 'text-slate-400'}`}>
          {SAVE_LABEL[saveState]}
        </span>
      </div>
      <div role="group" aria-label="Mode" className="flex rounded-xl bg-slate-100 p-1">
        <button type="button" aria-pressed={mode === 'canvas'} className={tab(mode === 'canvas')} onClick={() => setMode('canvas')}>
          Canvas
        </button>
        <button type="button" aria-pressed={mode === 'document'} className={tab(mode === 'document')} onClick={() => setMode('document')}>
          Document
        </button>
      </div>
      <div className="flex flex-1 items-center justify-end gap-2">
        <Account />
        <ReviewMenu className={action} onRun={(scope) => onReview?.(scope)} lastRunAt={lastRunAt} />
        <Menu label="Share" button={<><ShareIcon /> Share</>} className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700">
          <MenuItem onClick={() => void exportPdf()}>Export PDF</MenuItem>
          <MenuItem onClick={exportMd}>Export Markdown</MenuItem>
        </Menu>
        <Menu label="More" button="⋯" className={`${action} px-2.5 leading-none`}>
          <MenuItem onClick={loadExample}>Load example</MenuItem>
          {mode === 'canvas' && <MenuItem onClick={a.resetLayout}>Reset layout</MenuItem>}
          <MenuItem onClick={clearDesign}>Clear design</MenuItem>
        </Menu>
      </div>
    </header>
  )
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
      <path d="M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
    </svg>
  )
}

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
import { useLastExport } from '../export/gdocs'
import { exportOpenDesignToGoogleDocs } from '../export/gdocs-open'

/** 'today, 14:05' or '12 Sep, 14:05'. */
const formatExportTime = (iso: string) => {
  const d = new Date(iso)
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  const today = d.toDateString() === new Date().toDateString()
  return `${today ? 'today' : `${d.getDate()} ${d.toLocaleDateString('en-US', { month: 'short' })}`}, ${time}`
}
import { ReviewMenu } from '../review/ReviewMenu'
import type { SectionId } from '../model/design'
import { Menu, MenuItem } from './Menu'

export type Mode = 'canvas' | 'document'

const SAVE_LABEL = { saved: 'Saved', saving: 'Saving…', error: 'Not saved' }

const tab = (on: boolean) =>
  `flex-1 rounded-lg px-4 py-1.5 text-sm font-medium lg:flex-none ${on ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`
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
  const lastExport = useLastExport((s) => s.last)
  const exportGdocs = () => void exportOpenDesignToGoogleDocs()
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

  // One row (h-16) from lg up: the review panel and the document outline stick right under it.
  return (
    <header className="sticky top-0 z-40 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur sm:px-6 lg:h-16 lg:flex-nowrap lg:py-0 print:hidden">
      <div className="flex min-w-0 flex-1 basis-48 items-center gap-3 lg:basis-0">
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
          <InlineText label="Design title" value={title} placeholder="Untitled design" onSave={a.setTitle} maxLength={200} inputClassName="w-full max-w-80" />
        </h1>
        <span data-testid="header-save-state" className={`shrink-0 text-xs max-sm:sr-only ${saveState === 'error' ? 'font-medium text-red-600' : 'text-slate-400'}`}>
          {SAVE_LABEL[saveState]}
        </span>
      </div>
      <div role="group" aria-label="Mode" className="order-last flex basis-full justify-center rounded-xl bg-slate-100 p-1 lg:order-none lg:shrink-0 lg:basis-auto">
        <button type="button" aria-pressed={mode === 'canvas'} className={tab(mode === 'canvas')} onClick={() => setMode('canvas')}>
          Canvas
        </button>
        <button type="button" aria-pressed={mode === 'document'} className={tab(mode === 'document')} onClick={() => setMode('document')}>
          Document
        </button>
      </div>
      <div className="ml-auto flex flex-wrap items-center justify-end gap-2 lg:flex-1 lg:flex-nowrap">
        <Account />
        <ReviewMenu className={action} onRun={(scope) => onReview?.(scope)} lastRunAt={lastRunAt} />
        <Menu label="Share" button={<><ShareIcon /> <span className="max-sm:sr-only">Share</span></>} className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700">
          <MenuItem onClick={exportGdocs} className="flex w-full flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left font-medium hover:bg-slate-100">
            <span>Export to Google Docs</span>
            <span className="text-xs font-normal text-slate-500">Creates a new Google Doc in your Drive</span>
          </MenuItem>
          <MenuItem onClick={() => void exportPdf()}>Export PDF</MenuItem>
          <MenuItem onClick={exportMd}>Export Markdown</MenuItem>
          {lastExport && (
            <div data-testid="last-export" className="mx-3 mt-1 mb-1 flex items-center gap-2 border-t border-slate-100 pt-2 text-xs text-slate-500">
              <span>Last exported {formatExportTime(lastExport.at)}</span>
              <a href={lastExport.url} target="_blank" rel="noopener noreferrer" className="ml-auto font-semibold text-indigo-600 hover:text-indigo-700">
                Open
              </a>
            </div>
          )}
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

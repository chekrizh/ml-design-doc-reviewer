import { exampleDesign } from '../fixtures/example'
import { InlineText } from '../editor/InlineText'
import { confirmEmptySections, exportMarkdown } from '../export/download'
import { diagramToSvg } from '../export/svg'
import { diagramNonEmpty } from '../model/rules'
import { useDesign } from '../store/store'
import { Menu, MenuItem } from './Menu'

export type Mode = 'canvas' | 'document'

const SAVE_LABEL = { saved: 'Saved', saving: 'Saving…', error: 'Not saved' }

const tab = (on: boolean) =>
  `rounded-lg px-4 py-1.5 text-sm font-medium ${on ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`
const action = 'rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-50'

export function Header({ mode, setMode }: { mode: Mode; setMode: (m: Mode) => void }) {
  const title = useDesign((s) => s.design.title)
  const saveState = useDesign((s) => s.saveState)
  const a = useDesign.getState()

  const loadExample = () => {
    if (window.confirm('Load the example design? It replaces your current design.')) a.setDesign(exampleDesign())
  }
  const exportMd = () => {
    const d = useDesign.getState().design
    if (confirmEmptySections(d))
      exportMarkdown(d).catch(() => window.alert('Export failed: a diagram could not be rendered. Please try again.'))
  }
  const exportPdf = async () => {
    const d = useDesign.getState().design
    if (!confirmEmptySections(d)) return
    // Render the diagrams first: the Excalidraw chunk is large and loads lazily.
    try {
      await Promise.all(d.sections.filter((s) => diagramNonEmpty(s.diagram)).map((s) => diagramToSvg(s.diagram)))
    } catch {
      window.alert('Some diagrams could not be rendered and will be missing from the PDF.')
    }
    setMode('document')
    // Let the document render its (now cached) diagram images before printing.
    setTimeout(() => window.print(), 300)
  }

  return (
    <header className="sticky top-0 z-40 flex items-center gap-4 border-b border-slate-200 bg-white/90 px-6 py-3 backdrop-blur print:hidden">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white">ML</div>
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
        <Menu label="AI Review" button="AI Review" className={action}>
          {/* Wiring it to the review skill is M2. */}
          <span className="group relative block">
            <button type="button" role="menuitem" aria-disabled="true" aria-describedby="full-review-tip" className="flex w-full cursor-not-allowed items-center rounded-lg px-3 py-2 text-left font-medium text-slate-400">
              Full review
            </button>
            <span id="full-review-tip" role="tooltip" className="pointer-events-none absolute top-1/2 right-full mr-2 hidden -translate-y-1/2 rounded-lg bg-slate-900 px-2 py-1 text-xs whitespace-nowrap text-white group-focus-within:block group-hover:block">
              Coming soon
            </span>
          </span>
        </Menu>
        <Menu label="Share" button={<><ShareIcon /> Share</>} className="flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700">
          <MenuItem onClick={() => void exportPdf()}>Export PDF</MenuItem>
          <MenuItem onClick={exportMd}>Export Markdown</MenuItem>
        </Menu>
        <Menu label="More" button="⋯" className={`${action} px-2.5 leading-none`}>
          <MenuItem onClick={loadExample}>Load example</MenuItem>
          {mode === 'canvas' && <MenuItem onClick={a.resetLayout}>Reset layout</MenuItem>}
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

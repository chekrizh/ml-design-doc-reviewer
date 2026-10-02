import { useEffect, useState, type ReactNode } from 'react'
import { Canvas } from './canvas/Canvas'
import { Header, type Mode } from './canvas/Header'
import { DocumentView } from './document/DocumentView'
import { loadLocal, startLocalPersistence, stopLocalPersistence } from './store/persist'
import { useLastExport } from './export/gdocs'
import { Home } from './home/Home'
import { Toaster } from './ui/toast'
import { SettingsDialog } from './review/SettingsDialog'
import { DocComments } from './review/DocComments'
import { lastRunAt, openDesignReview, startReview, useReview } from './review/store'
import { useAuth } from './backend/auth'
import { closeCloudDesign, editorKey, openCloudDesign, openLibraryDesign, useCloud } from './backend/cloud'
import { navigate, parseRoute, routePath, usePath, type Route } from './router'

export function App() {
  const path = usePath()
  const route = parseRoute(path)
  // Unknown paths are normalized to the route they parse to (home).
  if (routePath(route) !== path) return <Redirect to={routePath(route)} />
  return (
    <>
      {/* Desktop only. A CSS media query, not JS, so printing (narrow paper) still renders the app. */}
      <div className="hidden min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 p-8 text-center max-xl:flex print:hidden!">
        <h1 className="text-2xl font-semibold">Open on desktop</h1>
        <p className="text-slate-500">ML System Design Trainer needs a screen at least 1280px wide.</p>
      </div>
      <div className="min-h-screen bg-slate-50 text-slate-900 max-xl:hidden print:block! print:bg-white">
        {route.name === 'home' ? <Home /> : route.name === 'local' ? <LocalDesign /> : <CloudDesign route={route} />}
      </div>
      <Toaster />
      <SettingsDialog onReview={route.name === 'cloud' || route.name === 'library' ? () => void startReview('design') : undefined} />
    </>
  )
}

function Redirect({ to }: { to: string }) {
  useEffect(() => navigate(to, { replace: true }), [to])
  return null
}

let queue: Promise<unknown> = Promise.resolve()

/**
 * Runs `open` when the editor mounts and `close` when it unmounts, one after another
 * (StrictMode mounts twice, and leaving a design must finish its pending save first).
 * Returns null while opening, false if the design could not be opened.
 */
function useDesignSource(open: () => Promise<boolean | void>, close: () => Promise<void>) {
  const [opened, setOpened] = useState<boolean | null>(null)
  useEffect(() => {
    let live = true
    queue = queue.then(open).then((ok) => {
      if (live) setOpened(ok !== false)
    })
    return () => {
      live = false
      queue = queue.then(close)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per mounted design (keyed by id)
  }, [])
  return opened
}

/** The guest's design from IndexedDB (/local). */
function LocalDesign() {
  const signedIn = useAuth((s) => s.account !== null)
  return signedIn ? <Redirect to="/" /> : <LocalEditor />
}

function LocalEditor() {
  const opened = useDesignSource(async () => {
    void openDesignReview(null)
    await startLocalPersistence()
    useLastExport.setState({ last: (await loadLocal().catch(() => null))?.meta.lastExport ?? null })
  }, () => stopLocalPersistence())
  return opened ? <Editor /> : null
}

/** A signed-in user's design (/d/:id) or a Library item not saved yet (/library/:itemId). */
function CloudDesign({ route }: { route: Extract<Route, { name: 'cloud' | 'library' }> }) {
  const { account, ready } = useAuth()
  if (!ready) return null
  if (!account) return <Redirect to="/" />
  // A Library item's first edit moves the URL to /d/:id; the same editor stays mounted.
  const key = route.name === 'library' ? `library:${route.itemId}` : (editorKey.get(route.id) ?? route.id)
  return <CloudEditor key={key} open={route.name === 'library' ? () => openLibraryDesign(route.itemId) : () => openCloudDesign(route.id)} />
}

function CloudEditor({ open }: { open: () => Promise<boolean> }) {
  const opened = useDesignSource(open, closeCloudDesign)
  if (opened === false) return <Redirect to="/" />
  return opened ? <Editor banner={<ConflictBanner />} /> : null
}

/** A save found a newer version (D23): autosave has stopped; reloading shows the stored design. */
function ConflictBanner() {
  const conflict = useCloud((s) => s.conflict)
  if (!conflict) return null
  return (
    <div role="alert" className="flex items-center justify-center gap-3 border-b border-red-200 bg-red-50 px-6 py-2 text-sm text-red-700 print:hidden">
      <span>
        <span className="font-semibold">This design was changed in another tab or device.</span> Your latest edits here are not saved.
      </span>
      <button type="button" className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700" onClick={() => location.reload()}>
        Reload
      </button>
    </div>
  )
}

function Editor({ banner }: { banner?: ReactNode }) {
  const [mode, setModeState] = useState<Mode>('canvas')
  const lastRun = useReview((s) => lastRunAt(s.runs))
  const setMode = (m: Mode) => {
    setModeState(m)
    window.scrollTo(0, 0)
  }
  return (
    <>
      <Header mode={mode} setMode={setMode} onReview={(scope) => void startReview(scope)} lastRunAt={lastRun} />
      {banner}
      {mode === 'canvas' ? <Canvas /> : <DocumentView comments={<DocComments />} />}
    </>
  )
}

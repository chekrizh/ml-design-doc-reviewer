import { useEffect, useState } from 'react'
import { Canvas } from './canvas/Canvas'
import { Header, type Mode } from './canvas/Header'
import { DocumentView } from './document/DocumentView'
import { startLocalPersistence, stopLocalPersistence } from './store/persist'
import { Home } from './home/Home'
import { useAuth } from './backend/auth'
import { closeCloudDesign, openCloudDesign } from './backend/cloud'
import { navigate, parseRoute, routePath, usePath } from './router'

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
        {route.name === 'home' ? <Home /> : route.name === 'local' ? <LocalDesign /> : route.name === 'cloud' ? <CloudDesign key={route.id} id={route.id} /> : <Redirect to="/" />}
      </div>
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
  const opened = useDesignSource(startLocalPersistence, () => stopLocalPersistence())
  return opened ? <Editor /> : null
}

/** A signed-in user's design from Supabase (/d/:id). */
function CloudDesign({ id }: { id: string }) {
  const { account, ready } = useAuth()
  if (!ready) return null
  if (!account) return <Redirect to="/" />
  return <CloudEditor id={id} />
}

function CloudEditor({ id }: { id: string }) {
  const opened = useDesignSource(() => openCloudDesign(id), closeCloudDesign)
  if (opened === false) return <Redirect to="/" />
  return opened ? <Editor /> : null
}

function Editor() {
  const [mode, setModeState] = useState<Mode>('canvas')
  const setMode = (m: Mode) => {
    setModeState(m)
    window.scrollTo(0, 0)
  }
  return (
    <>
      <Header mode={mode} setMode={setMode} />
      {mode === 'canvas' ? <Canvas /> : <DocumentView />}
    </>
  )
}

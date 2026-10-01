import { useEffect, useState } from 'react'
import { Canvas } from './canvas/Canvas'
import { Header, type Mode } from './canvas/Header'
import { DocumentView } from './document/DocumentView'
import { startLocalPersistence, stopLocalPersistence } from './store/persist'
import { Home } from './home/Home'
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
        {route.name === 'home' ? <Home /> : route.name === 'local' ? <LocalDesign /> : <Redirect to="/" />}
      </div>
    </>
  )
}

function Redirect({ to }: { to: string }) {
  useEffect(() => navigate(to, { replace: true }), [to])
  return null
}

let queue = Promise.resolve()

/** The guest's design from IndexedDB (/local). */
function LocalDesign() {
  const [ready, setReady] = useState(false)
  const [mode, setModeState] = useState<Mode>('canvas')
  const setMode = (m: Mode) => {
    setModeState(m)
    window.scrollTo(0, 0)
  }

  useEffect(() => {
    let live = true
    // Serialized: StrictMode mounts twice, and leaving /local must finish its pending save.
    queue = queue.then(startLocalPersistence).then(() => {
      if (live) setReady(true)
    })
    return () => {
      live = false
      queue = queue.then(() => stopLocalPersistence())
    }
  }, [])

  if (!ready) return null
  return (
    <>
      <Header mode={mode} setMode={setMode} />
      {mode === 'canvas' ? <Canvas /> : <DocumentView />}
    </>
  )
}

import { useEffect, useState, useSyncExternalStore } from 'react'
import { Canvas } from './canvas/Canvas'
import { Header, type Mode } from './canvas/Header'
import { DocumentView } from './document/DocumentView'
import { startPersistence } from './store/persist'

const desktop = window.matchMedia('(min-width: 1280px)')
const useDesktop = () =>
  useSyncExternalStore(
    (cb) => (desktop.addEventListener('change', cb), () => desktop.removeEventListener('change', cb)),
    () => desktop.matches,
  )

let started: Promise<void> | undefined

export function App() {
  const [ready, setReady] = useState(false)
  const [mode, setModeState] = useState<Mode>('canvas')
  const setMode = (m: Mode) => {
    setModeState(m)
    window.scrollTo(0, 0)
  }
  const isDesktop = useDesktop()

  useEffect(() => {
    started ??= startPersistence()
    started.then(() => setReady(true))
  }, [])

  if (!isDesktop)
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 p-8 text-center">
        <h1 className="text-2xl font-semibold">Open on desktop</h1>
        <p className="text-slate-500">ML System Design Trainer needs a screen at least 1280px wide.</p>
      </div>
    )
  if (!ready) return null
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 print:bg-white">
      <Header mode={mode} setMode={setMode} />
      {mode === 'canvas' ? <Canvas /> : <DocumentView />}
    </div>
  )
}

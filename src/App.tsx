import { useEffect, useState } from 'react'
import { Canvas } from './canvas/Canvas'
import { Header, type Mode } from './canvas/Header'
import { DocumentView } from './document/DocumentView'
import { startPersistence } from './store/persist'

let started: Promise<void> | undefined

export function App() {
  const [ready, setReady] = useState(false)
  const [mode, setModeState] = useState<Mode>('canvas')
  const setMode = (m: Mode) => {
    setModeState(m)
    window.scrollTo(0, 0)
  }

  useEffect(() => {
    started ??= startPersistence()
    started.then(() => setReady(true))
  }, [])

  return (
    <>
      {/* Desktop only. A CSS media query, not JS, so printing (narrow paper) still renders the app. */}
      <div className="hidden min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 p-8 text-center max-xl:flex print:hidden!">
        <h1 className="text-2xl font-semibold">Open on desktop</h1>
        <p className="text-slate-500">ML System Design Trainer needs a screen at least 1280px wide.</p>
      </div>
      {ready && (
        <div className="min-h-screen bg-slate-50 text-slate-900 max-xl:hidden print:block! print:bg-white">
          <Header mode={mode} setMode={setMode} />
          {mode === 'canvas' ? <Canvas /> : <DocumentView />}
        </div>
      )}
    </>
  )
}

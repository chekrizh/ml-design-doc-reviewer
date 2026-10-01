import { Account } from '../canvas/Account'
import { navigate } from '../router'

/** Main screen. The header is final; the body is a placeholder until m2-home-01 builds the gallery. */
export function Home() {
  return (
    <>
      <header className="border-b border-slate-200 bg-white px-4">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-900 text-white">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <rect x="1.5" y="1.5" width="5" height="5" rx="1" />
              <rect x="9.5" y="9.5" width="5" height="5" rx="1" />
              <path d="M4 6.5v5.5h5.5" />
            </svg>
          </div>
          <span className="font-semibold text-slate-900">ML System Design Trainer</span>
          <div className="ml-auto flex items-center gap-2">
            <Account />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-5">
        <h2 className="text-lg font-semibold">Design a system</h2>
        <button type="button" className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white" onClick={() => navigate('/local')}>
          Continue
        </button>
      </main>
    </>
  )
}

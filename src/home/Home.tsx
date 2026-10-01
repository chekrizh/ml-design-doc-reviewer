import { navigate } from '../router'

/** Main screen. Placeholder until m2-home-01 builds the gallery. */
export function Home() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Design a system</h1>
      <button type="button" className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white" onClick={() => navigate('/local')}>
        Continue
      </button>
    </main>
  )
}

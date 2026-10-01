import { useSyncExternalStore } from 'react'

/** Routes on the History API without a dependency (D27, docs/backend-spec.md §5.2). */
export type Route =
  | { name: 'home' }
  | { name: 'local' }
  | { name: 'cloud'; id: string }
  | { name: 'library'; itemId: string }

export function parseRoute(path: string): Route {
  if (path === '/local') return { name: 'local' }
  const m = path.match(/^\/(d|library)\/([^/]+)$/)
  if (m) return m[1] === 'd' ? { name: 'cloud', id: decodeURIComponent(m[2]) } : { name: 'library', itemId: decodeURIComponent(m[2]) }
  return { name: 'home' }
}

export const routePath = (r: Route) =>
  r.name === 'home' ? '/' : r.name === 'local' ? '/local' : r.name === 'cloud' ? `/d/${encodeURIComponent(r.id)}` : `/library/${encodeURIComponent(r.itemId)}`

const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())
window.addEventListener('popstate', notify)

export function navigate(path: string, opts: { replace?: boolean } = {}) {
  if (path === location.pathname) return
  history[opts.replace ? 'replaceState' : 'pushState'](null, '', path)
  window.scrollTo(0, 0)
  notify()
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

/** The current path; the Route is derived so that equal paths give a stable snapshot. */
export const usePath = () => useSyncExternalStore(subscribe, () => location.pathname)

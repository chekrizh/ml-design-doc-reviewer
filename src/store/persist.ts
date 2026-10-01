import type { Design } from '../model/design'
import { useDesign } from './store'

const DB = 'ml-design-trainer'
const STORE = 'designs'
const KEY = 'current'

const open = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })

const run = async <T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>) => {
  const db = await open()
  return new Promise<T>((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  }).finally(() => db.close())
}

export const loadDesign = () => run<Design | undefined>('readonly', (s) => s.get(KEY))
export const saveDesign = (d: Design) => run('readwrite', (s) => s.put(d, KEY))

/**
 * Loads the saved design into the store, then saves every change (debounced).
 * Never rejects: if storage is unavailable the app still works and shows "Not saved".
 */
export async function startPersistence() {
  const { setDesign, setSaveState } = useDesign.getState()
  try {
    const saved = await loadDesign()
    if (saved) setDesign(saved)
  } catch (e) {
    console.warn('Could not load the saved design', e)
    setSaveState('error')
  }
  let timer: ReturnType<typeof setTimeout> | undefined
  const flush = async () => {
    clearTimeout(timer)
    timer = undefined
    const d = useDesign.getState().design
    try {
      await saveDesign(d)
      if (useDesign.getState().design === d) setSaveState('saved')
    } catch (e) {
      console.warn('Could not save the design', e)
      setSaveState('error')
    }
  }
  useDesign.subscribe((s, prev) => {
    if (s.design === prev.design) return
    setSaveState('saving')
    clearTimeout(timer)
    timer = setTimeout(flush, 200)
  })
  // Best effort: write a pending change when the tab is closed or reloaded.
  window.addEventListener('pagehide', () => timer !== undefined && void flush())
}

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

/** Loads the saved design into the store, then saves every change (debounced). */
export async function startPersistence() {
  const saved = await loadDesign()
  if (saved) useDesign.getState().setDesign(saved)
  let timer: ReturnType<typeof setTimeout> | undefined
  useDesign.subscribe((s, prev) => {
    if (s.design === prev.design) return
    useDesign.getState().setSaveState('saving')
    clearTimeout(timer)
    timer = setTimeout(async () => {
      const d = useDesign.getState().design
      await saveDesign(d)
      if (useDesign.getState().design === d) useDesign.getState().setSaveState('saved')
    }, 200)
  })
}

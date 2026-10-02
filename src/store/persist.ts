import { emptyDesign, newId, type Design } from '../model/design'
import { useDesign } from './store'

const DB = 'ml-design-trainer'
const STORE = 'designs'
const KEY = 'current'
const META = 'meta'

/** Next to the guest's design (docs/backend-spec.md §5.4). */
export interface LocalMeta {
  id: string
  origin: 'blank' | 'task' | 'example'
  sourceId: string | null
  lastExport: { url: string; at: string } | null
}

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
export const saveMeta = (m: LocalMeta) => run('readwrite', (s) => s.put(m, META))

/** A design saved by M1 has no meta: it gets one with a new id and origin 'blank' on first read. */
export async function loadMeta(): Promise<LocalMeta> {
  const saved = await run<LocalMeta | undefined>('readonly', (s) => s.get(META))
  if (saved) return saved
  const meta: LocalMeta = { id: newId(), origin: 'blank', sourceId: null, lastExport: null }
  await saveMeta(meta)
  return meta
}

/**
 * Saves every change of the store's design through `save`, debounced.
 * `flush` writes a pending change now; `stop` ends it (after flushing unless told not to).
 */
export function autosave(save: (d: Design) => Promise<unknown>, delayMs: number) {
  const { setSaveState } = useDesign.getState()
  let timer: ReturnType<typeof setTimeout> | undefined
  const flush = async () => {
    if (timer === undefined) return
    clearTimeout(timer)
    timer = undefined
    const d = useDesign.getState().design
    try {
      await save(d)
      if (useDesign.getState().design === d) setSaveState('saved')
    } catch (e) {
      console.warn('Could not save the design', e)
      setSaveState('error')
    }
  }
  const unsubscribe = useDesign.subscribe((s, prev) => {
    if (s.design === prev.design) return
    setSaveState('saving')
    clearTimeout(timer)
    timer = setTimeout(() => void flush(), delayMs)
  })
  // Best effort: write a pending change when the tab is closed or reloaded.
  const onHide = () => void flush()
  window.addEventListener('pagehide', onHide)
  return {
    flush,
    stop: async (opts: { flush?: boolean } = {}) => {
      unsubscribe()
      window.removeEventListener('pagehide', onHide)
      if (opts.flush !== false) await flush()
      clearTimeout(timer)
      timer = undefined
    },
  }
}

let local: ReturnType<typeof autosave> | null = null

/**
 * Loads the guest's design into the store and autosaves it to IndexedDB.
 * Never rejects: if storage is unavailable the app still works and shows "Not saved".
 */
export async function startLocalPersistence() {
  await stopLocalPersistence()
  const { setDesign, setSaveState } = useDesign.getState()
  setSaveState('saved')
  try {
    setDesign((await loadDesign()) ?? emptyDesign())
  } catch (e) {
    console.warn('Could not load the saved design', e)
    setDesign(emptyDesign())
    setSaveState('error')
  }
  local = autosave(saveDesign, 200)
}

export async function stopLocalPersistence(opts: { flush?: boolean } = {}) {
  const l = local
  local = null
  await l?.stop(opts)
}

/** Writes a pending local change now (before the design is read for the move to the account). */
export const flushLocal = () => local?.flush() ?? Promise.resolve()

/** Removes the guest's design and meta; a running local autosave stops without writing. */
export async function clearLocal() {
  await stopLocalPersistence({ flush: false })
  await run('readwrite', (s) => s.clear())
}

/** The guest's design and meta, or null when there is none (Current work on the home screen). */
export async function loadLocal(): Promise<{ design: Design; meta: LocalMeta } | null> {
  const design = await loadDesign().catch(() => undefined)
  if (!design) return null
  return { design, meta: await loadMeta() }
}

/** Replaces the guest's design: New design, Start task, Open example (after confirmation if needed). */
export async function replaceLocal(design: Design, origin: LocalMeta['origin'], sourceId: string | null = null) {
  await clearLocal()
  await saveDesign(design)
  await saveMeta({ id: newId(), origin, sourceId, lastExport: null })
}

/** The guest's last Google Docs export, kept in meta (§8.3). */
export async function recordLocalExport(lastExport: LocalMeta['lastExport']) {
  await saveMeta({ ...(await loadMeta()), lastExport })
}

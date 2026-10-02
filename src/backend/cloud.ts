import { create } from 'zustand'
import type { Design } from '../model/design'
import { designSummary } from '../model/summary'
import { autosave } from '../store/persist'
import { useDesign } from '../store/store'
import { libraryDesign, libraryItem } from '../fixtures/library'
import { useLastExport, type LastExport } from '../export/gdocs'
import { navigate } from '../router'
import { createDesign } from './designs'
import { getSupabase } from './supabase'
import { openDesignReview, setEnsureDesignId, useReview } from '../review/store'

/** The open cloud design: its row id, the version this tab last saw, and whether a save hit a conflict (D23). */
export const useCloud = create<{ id: string | null; version: number; conflict: boolean }>(() => ({ id: null, version: 0, conflict: false }))

let saver: ReturnType<typeof autosave> | null = null

/** Thrown by a save whose `version` is stale: someone else saved first. */
export class ConflictError extends Error {}

/** Set while a Library item is open but not yet saved: its first edit creates the design. */
let pendingItem: { id: string; kind: 'example' | 'task' } | null = null

/**
 * The editor key of a design that started as a Library item: keeps the same editor mounted
 * when the URL moves from /library/:itemId to /d/:id, so nothing reloads after the first edit.
 */
export const editorKey = new Map<string, string>()

async function save(d: Design) {
  if (pendingItem) {
    const item = pendingItem
    const id = await createDesign(d, item.kind, item.id)
    pendingItem = null
    useCloud.setState({ id, version: 1, conflict: false })
    useReview.setState({ designId: id })
    editorKey.set(id, `library:${item.id}`)
    navigate(`/d/${id}`, { replace: true })
    return
  }
  const { id, version } = useCloud.getState()
  const { data, error } = await getSupabase()!
    .from('designs')
    .update({ data: d, title: d.title, summary: designSummary(d) })
    .eq('id', id!)
    .eq('version', version)
    .select('version')
  if (error) throw error
  if (!data.length) {
    useCloud.setState({ conflict: true })
    // Autosave of this design stops until reload.
    void saver?.stop({ flush: false })
    saver = null
    throw new ConflictError('The design was changed elsewhere')
  }
  useCloud.setState({ version: data[0].version })
}

/** Loads a cloud design into the store and autosaves it (800 ms debounce, docs/backend-spec.md §5.3). */
export async function openCloudDesign(id: string): Promise<boolean> {
  await closeCloudDesign()
  const { data, error } = await getSupabase()!.from('designs').select('data, version, last_export').eq('id', id).maybeSingle()
  if (error || !data) return false
  useLastExport.setState({ last: data.last_export ?? null })
  useCloud.setState({ id, version: data.version, conflict: false })
  useDesign.getState().setDesign(data.data as Design)
  useDesign.getState().setSaveState('saved')
  saver = autosave(save, 800)
  void openDesignReview(id)
  return true
}

/**
 * A Library item for a signed-in user (/library/:itemId): shown as is, nothing is created
 * until the first edit, which saves a copy (§5.2, AT-28).
 */
export async function openLibraryDesign(itemId: string): Promise<boolean> {
  await closeCloudDesign()
  const item = libraryItem(itemId)
  if (!item) return false
  pendingItem = { id: item.id, kind: item.kind }
  useCloud.setState({ id: null, version: 0, conflict: false })
  useDesign.getState().setDesign(libraryDesign(itemId))
  useDesign.getState().setSaveState('saved')
  useLastExport.setState({ last: null })
  saver = autosave(save, 800)
  void openDesignReview(null)
  return true
}

export async function closeCloudDesign() {
  pendingItem = null
  const s = saver
  saver = null
  await s?.stop()
}

// A review needs the design in the cloud: an unsaved Library item is saved now; pending edits are written first.
setEnsureDesignId(async () => {
  if (pendingItem) await save(useDesign.getState().design)
  else await saver?.flush()
  return useCloud.getState().id
})

/** Records a Google Docs export on the open cloud design (last_export does not bump the version). */
export async function recordCloudExport(last: LastExport) {
  const id = useCloud.getState().id
  if (!id) return
  await getSupabase()!.from('designs').update({ last_export: last }).eq('id', id)
}

import { create } from 'zustand'
import type { Design } from '../model/design'
import { designSummary } from '../model/summary'
import { autosave } from '../store/persist'
import { useDesign } from '../store/store'
import { getSupabase } from './supabase'

/** The open cloud design: its row id, the version this tab last saw, and whether a save hit a conflict (D23). */
export const useCloud = create<{ id: string | null; version: number; conflict: boolean }>(() => ({ id: null, version: 0, conflict: false }))

let saver: ReturnType<typeof autosave> | null = null

/** Thrown by a save whose `version` is stale: someone else saved first. */
export class ConflictError extends Error {}

async function save(d: Design) {
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
  const { data, error } = await getSupabase()!.from('designs').select('data, version').eq('id', id).maybeSingle()
  if (error || !data) return false
  useCloud.setState({ id, version: data.version, conflict: false })
  useDesign.getState().setDesign(data.data as Design)
  useDesign.getState().setSaveState('saved')
  saver = autosave(save, 800)
  return true
}

export async function closeCloudDesign() {
  const s = saver
  saver = null
  await s?.stop()
}

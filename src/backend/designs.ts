import type { Design } from '../model/design'
import { designHasContent, designSummary } from '../model/summary'
import { clearLocal, flushLocal, loadDesign, loadMeta } from '../store/persist'
import { getSupabase } from './supabase'

const db = () => {
  const sb = getSupabase()
  if (!sb) throw new Error('Supabase is not configured')
  return sb
}

/**
 * Moves the guest's design to the account (docs/backend-spec.md §5.4): a new cloud design,
 * idempotent through client_id = meta.id; IndexedDB is cleared only after the insert succeeded.
 * Returns the cloud id, or null when there was nothing worth moving. Throws if the insert fails.
 */
export async function importGuestDesign(): Promise<string | null> {
  await flushLocal()
  const design: Design | undefined = await loadDesign().catch(() => undefined)
  if (!design || !designHasContent(design)) return null
  const meta = await loadMeta()
  const row = {
    client_id: meta.id,
    origin: meta.origin,
    source_id: meta.sourceId,
    title: design.title,
    data: design,
    summary: designSummary(design),
    last_export: meta.lastExport,
  }
  const ins = await db().from('designs').upsert(row, { onConflict: 'user_id,client_id', ignoreDuplicates: true })
  if (ins.error) throw ins.error
  // On a repeated move (the earlier clear failed) the row already exists: look it up.
  const found = await db().from('designs').select('id').eq('client_id', meta.id).single()
  if (found.error) throw found.error
  await clearLocal()
  return found.data.id as string
}

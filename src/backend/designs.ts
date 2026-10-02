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
export async function importGuestDesign(onStart: (title: string) => void = () => {}): Promise<string | null> {
  await flushLocal()
  const design: Design | undefined = await loadDesign().catch(() => undefined)
  if (!design || !designHasContent(design)) return null
  onStart(design.title)
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

export type Origin = 'blank' | 'task' | 'example'

export interface DesignRow {
  id: string
  title: string
  origin: Origin
  summary: import('../model/summary').DesignSummary
  updated_at: string
  openFindings: number
}

/** 'Your designs': last edited first, with open findings from design_open_findings (§5.3). */
export async function listDesigns(): Promise<DesignRow[]> {
  const [rows, open] = await Promise.all([
    db().from('designs').select('id, title, origin, summary, updated_at').order('updated_at', { ascending: false }),
    db().from('design_open_findings').select('design_id, count'),
  ])
  if (rows.error) throw rows.error
  if (open.error) throw open.error
  const counts = new Map<string, number>()
  for (const r of open.data) counts.set(r.design_id, (counts.get(r.design_id) ?? 0) + r.count)
  return rows.data.map((r) => ({ ...r, openFindings: counts.get(r.id) ?? 0 }) as DesignRow)
}

/** New design, Start task and the first edit of an example insert a cloud design (§5.3). */
export async function createDesign(design: Design, origin: Origin, sourceId: string | null = null): Promise<string> {
  const { data, error } = await db()
    .from('designs')
    .insert({ origin, source_id: sourceId, title: design.title, data: design, summary: designSummary(design) })
    .select('id')
    .single()
  if (error) throw error
  return data.id as string
}

/** Runs and findings go with it (on delete cascade). */
export async function deleteDesign(id: string) {
  const { error } = await db().from('designs').delete().eq('id', id)
  if (error) throw error
}

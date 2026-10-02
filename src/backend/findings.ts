import type { Finding, FindingStatus, ReviewRun } from '@review/types.ts'
import { getSupabase } from './supabase'

const FINDING_COLUMNS = 'id, run_id, design_id, position, severity, dimension, section, anchor_kind, anchor_id, anchor_label, anchor_value, title, evidence, why, fix, status, status_changed_at, created_at'

/** Current findings of a design (replaced ones are history, §5.5). */
export async function loadFindings(designId: string): Promise<Finding[]> {
  const { data, error } = await getSupabase()!.from('findings').select(FINDING_COLUMNS).eq('design_id', designId).is('replaced_by_run_id', null).order('position')
  if (error) throw error
  return data as Finding[]
}

/** Recent runs, newest first (§5.5). */
export async function loadRuns(designId: string): Promise<ReviewRun[]> {
  const { data, error } = await getSupabase()!.from('review_runs').select('id, scope, status, model, started_at, finished_at, error_code').eq('design_id', designId).order('started_at', { ascending: false }).limit(20)
  if (error) throw error
  return data as ReviewRun[]
}

/** Cancels a running run; false when the server had already finished it (§5.5 Cancel). */
export async function cancelRun(runId: string): Promise<boolean> {
  const { data, error } = await getSupabase()!.from('review_runs').update({ status: 'canceled' }).eq('id', runId).eq('status', 'running').select('id')
  if (error) throw error
  return data.length > 0
}

export async function setFindingStatus(id: string, status: FindingStatus) {
  const { error } = await getSupabase()!.from('findings').update({ status, status_changed_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

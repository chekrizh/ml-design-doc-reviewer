import { callFunction } from './functions'
import { getSupabase } from './supabase'

export interface KeySettings {
  model: string | null
  last4: string | null
  addedAt: string | null
}
export interface ModelList {
  models: { id: string; name: string }[]
  default: string | null
}

/** Column grants hide key_secret_id: the columns are always listed (§4). */
export async function loadSettings(): Promise<KeySettings> {
  const { data, error } = await getSupabase()!.from('user_settings').select('user_id, model, key_last4, key_added_at').maybeSingle()
  if (error) throw error
  return { model: data?.model ?? null, last4: data?.key_last4 ?? null, addedAt: data?.key_added_at ?? null }
}

export type SaveKeyResult = { ok: true; last4: string; addedAt: string } | { ok: false; code: string }

export async function saveKey(key: string): Promise<SaveKeyResult> {
  const res = await callFunction<{ last4: string; addedAt: string; error?: { code: string } }>('openrouter-key', { action: 'save', key })
  return res.status === 200 ? { ok: true, last4: res.body.last4, addedAt: res.body.addedAt } : { ok: false, code: res.body.error?.code ?? 'provider_error' }
}

export async function deleteKey() {
  const res = await callFunction('openrouter-key', { action: 'delete' })
  if (res.status !== 200) throw new Error('delete failed')
}

export async function listModels(): Promise<ModelList> {
  const res = await callFunction<ModelList>('openrouter-models', {})
  if (res.status !== 200) throw new Error('models failed')
  return res.body
}

export async function setModel(userId: string, model: string) {
  const { error } = await getSupabase()!.from('user_settings').upsert({ user_id: userId, model }, { onConflict: 'user_id' })
  if (error) throw error
}

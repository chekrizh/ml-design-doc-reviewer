import { getSupabase } from './supabase'

/** Calls an edge function as the signed-in user; returns the status and JSON body (errors included, §6.1). */
export async function callFunction<T = unknown>(name: string, body: object, signal?: AbortSignal): Promise<{ status: number; body: T }> {
  const sb = getSupabase()!
  const token = (await sb.auth.getSession()).data.session?.access_token
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY!, 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: JSON.stringify(body),
    signal,
  })
  return { status: res.status, body: (await res.json().catch(() => ({}))) as T }
}

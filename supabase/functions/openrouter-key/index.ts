// Save or delete the user's OpenRouter key (docs/backend-spec.md §6.2). The key goes to Vault and never back.
import { HttpError, json, serve } from '../_shared/http.ts'
import { openrouter } from '../_shared/openrouter.ts'
import { requireUser, rpc, select } from '../_shared/supabase.ts'
import { KEY_REJECTED_ON_SAVE } from '../_shared/review/errors.ts'

const FORMAT = /^sk-or-v1-[A-Za-z0-9_-]{8,}$/

serve('openrouter-key', async (req, body) => {
  const user = await requireUser(req)
  if (body.action === 'delete') {
    await rpc('svc_delete_openrouter_key', { p_user: user.id })
    return json(req, 200, {})
  }
  if (body.action !== 'save') throw new HttpError('bad_request')
  const key = typeof body.key === 'string' ? body.key.trim() : ''
  if (!FORMAT.test(key)) throw new HttpError('invalid_key_format')
  // A free request that only succeeds with a working key.
  let res: Response
  try {
    res = await openrouter('/key', key, { method: 'GET', signal: AbortSignal.timeout(15_000) })
  } catch {
    throw new HttpError('provider_error')
  }
  if (res.status === 401) return json(req, KEY_REJECTED_ON_SAVE, { error: { code: 'key_rejected', message: 'OpenRouter rejected your key' } })
  if (!res.ok) throw new HttpError('provider_error')
  const last4 = await rpc('svc_set_openrouter_key', { p_user: user.id, p_key: key })
  const [s] = (await select('service', 'user_settings', `select=key_added_at&user_id=eq.${user.id}`)) as { key_added_at: string }[]
  return json(req, 200, { last4, addedAt: s.key_added_at })
})

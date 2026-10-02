// Supabase from the edge functions with plain fetch (D32): the user's client (their JWT, RLS applies)
// and the service client (secret key, for svc_* functions and server-only writes).
import { HttpError } from './http.ts'

const URL_ = () => Deno.env.get('SUPABASE_URL')!
const keyFrom = (dict: string, legacy: string) => JSON.parse(Deno.env.get(dict) ?? '{}').default ?? Deno.env.get(legacy)!
const publishable = () => keyFrom('SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_ANON_KEY')
const secret = () => keyFrom('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY')

/** The calling user, or a 401 `unauthenticated`. */
export async function requireUser(req: Request): Promise<{ id: string; jwt: string }> {
  const auth = req.headers.get('Authorization') ?? ''
  const jwt = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!jwt) throw new HttpError('unauthenticated')
  const res = await fetch(`${URL_()}/auth/v1/user`, { headers: { apikey: publishable(), Authorization: `Bearer ${jwt}` } })
  if (!res.ok) throw new HttpError('unauthenticated')
  const user = await res.json()
  if (!user?.id) throw new HttpError('unauthenticated')
  return { id: user.id, jwt }
}

type Who = { jwt: string } | 'service'

async function call(who: Who, path: string, init: RequestInit & { prefer?: string } = {}) {
  const headers: Record<string, string> =
    who === 'service' ? { apikey: secret(), Authorization: `Bearer ${secret()}` } : { apikey: publishable(), Authorization: `Bearer ${who.jwt}` }
  headers['Content-Type'] = 'application/json'
  if (init.prefer) headers.Prefer = init.prefer
  const res = await fetch(`${URL_()}${path}`, { ...init, headers })
  if (!res.ok) throw new Error(`supabase ${res.status}`)
  return res.status === 204 ? null : res.json()
}

export const select = (who: Who, table: string, query: string) => call(who, `/rest/v1/${table}?${query}`)
export const insert = (who: Who, table: string, row: object) => call(who, `/rest/v1/${table}`, { method: 'POST', body: JSON.stringify(row), prefer: 'return=minimal' })
export const update = (who: Who, table: string, query: string, patch: object) =>
  call(who, `/rest/v1/${table}?${query}`, { method: 'PATCH', body: JSON.stringify(patch), prefer: 'return=minimal' })
export const rpc = (fn: string, args: object) => call('service', `/rest/v1/rpc/${fn}`, { method: 'POST', body: JSON.stringify(args) })

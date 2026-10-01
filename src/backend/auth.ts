import { create } from 'zustand'
import type { Session } from '@supabase/supabase-js'
import { navigate } from '../router'
import { getSupabase } from './supabase'

export type Account = { id: string; email: string; name: string; avatarUrl: string | null }

/** `ready` turns true once the stored session (or the OAuth code in the URL) has been read. */
export const useAuth = create<{ account: Account | null; ready: boolean }>(() => ({ account: null, ready: false }))

const toAccount = (s: Session | null): Account | null => {
  if (!s) return null
  const m = s.user.user_metadata ?? {}
  return { id: s.user.id, email: s.user.email ?? '', name: m.full_name ?? m.name ?? s.user.email ?? '', avatarUrl: m.avatar_url ?? m.picture ?? null }
}

/** Called once at app start: the client must exist before the OAuth redirect's `?code=` is exchanged. */
export function startAuth() {
  const sb = getSupabase()
  if (!sb) return useAuth.setState({ ready: true })
  sb.auth.onAuthStateChange((event, session) => {
    // Token refreshes keep the same user; only a change of user re-renders.
    const account = toAccount(session)
    if (account?.id !== useAuth.getState().account?.id || event === 'INITIAL_SESSION') useAuth.setState({ account, ready: true })
  })
}

export async function signInWithGoogle() {
  await getSupabase()?.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.href } })
}

export async function signOut() {
  await getSupabase()?.auth.signOut()
  navigate('/')
}

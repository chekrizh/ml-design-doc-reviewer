import { create } from 'zustand'
import type { Session } from '@supabase/supabase-js'
import { navigate } from '../router'
import { importGuestDesign } from './designs'
import { showToast } from '../ui/toast'
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
  sb.auth.onAuthStateChange((_event, session) => {
    const account = toAccount(session)
    // Token refreshes keep the same user; only a change of user re-renders.
    if (useAuth.getState().ready && account?.id === useAuth.getState().account?.id) return
    // Outside the callback: supabase-js calls inside it would wait on the auth lock.
    setTimeout(() => void (account ? enter(account) : useAuth.setState({ account: null, ready: true })))
  })
}

/** On sign-in (and on load with a session, which retries a failed move) the guest design moves first. */
async function enter(account: Account) {
  let name = ''
  try {
    const id = await importGuestDesign((title) => {
      name = title.trim() || 'Untitled design'
      showToast({ kind: 'progress', text: `Moving “${name}” to your account…` })
    })
    if (id) showToast({ kind: 'success', text: `“${name}” is now in your account` })
    if (id && location.pathname === '/local') navigate(`/d/${id}`, { replace: true })
  } catch (e) {
    // The local design stays in IndexedDB and is moved on the next sign-in.
    console.warn('Could not move the guest design to the account', e)
    showToast({
      kind: 'error',
      text: `“${name}” could not be moved to your account. It stays in this browser.`,
      actions: [{ label: 'Try again', onClick: () => void enter(account) }],
    })
  }
  useAuth.setState({ account, ready: true })
}

export async function signInWithGoogle() {
  await getSupabase()?.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.href } })
}

export async function signOut() {
  await getSupabase()?.auth.signOut()
  navigate('/')
}

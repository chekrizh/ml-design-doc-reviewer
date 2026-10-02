import { create } from 'zustand'
import type { Session } from '@supabase/supabase-js'
import { navigate } from '../router'
import { importGuestDesign } from './designs'
import { quotaMessage } from './quota'
import { showToast } from '../ui/toast'
import { refreshSettings, resetReview } from '../review/store'
import { getSupabase } from './supabase'
import { callFunction } from './functions'
import { confirmDialog } from '../dialogs'

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
    setTimeout(() => {
      if (account) return void enter(account)
      resetReview()
      useAuth.setState({ account: null, ready: true })
    })
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
      detail: quotaMessage(e) ?? undefined,
      actions: [{ label: 'Try again', onClick: () => void enter(account) }],
    })
  }
  useAuth.setState({ account, ready: true })
  void refreshSettings().catch(() => null)
}

/** Whether the Supabase project has the Google provider on. Unknown (network error) counts as on: let OAuth report it. */
async function googleEnabled() {
  try {
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '' } })
    return (await res.json()).external?.google !== false
  } catch {
    return true
  }
}

export async function signInWithGoogle() {
  const supabase = getSupabase()
  if (!supabase) return
  // Without this check the browser lands on Supabase's raw JSON error page.
  if (!(await googleEnabled())) {
    showToast({ kind: 'error', text: 'Google sign-in is not set up on this server yet.' })
    return
  }
  await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.href } })
}

export async function signOut() {
  await getSupabase()?.auth.signOut()
  navigate('/')
}

/** Delete account on /privacy (D38): the server removes the user and everything they own. */
export async function deleteAccount() {
  const ok = await confirmDialog(
    'Your account, designs, reviews and OpenRouter key are removed for good. A design in this browser (not signed in) stays.',
    'Delete account',
    'Delete your account?',
  )
  if (!ok) return
  showToast({ kind: 'progress', text: 'Deleting your account…' })
  const res = await callFunction('delete-account', {}).catch(() => null)
  if (res?.status !== 200) return showToast({ kind: 'error', text: 'Your account could not be deleted. Please try again.', actions: [{ label: 'Try again', onClick: () => void deleteAccount() }] })
  // The user no longer exists: drop the session locally only.
  await getSupabase()?.auth.signOut({ scope: 'local' })
  navigate('/')
  showToast({ kind: 'success', text: 'Your account was deleted' })
}

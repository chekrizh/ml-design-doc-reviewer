import { getSupabase } from './supabase'

/**
 * Local-only sign-in that skips Google (docs/backend-spec.md §7). Vite replaces the flag at build
 * time and the whole branch, label and password included, is dropped from a build without
 * VITE_TEST_SIGNIN=true (checked by e2e/m2/auth.spec.ts). Keep the gate and the button in this module.
 */
export const TestSignIn =
  import.meta.env.VITE_TEST_SIGNIN === 'true'
    ? function TestSignIn() {
        return (
          <button type="button" title="Local development only: a shared account with a known password" className="rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-50" onClick={() => void getSupabase()?.auth.signInWithPassword({ email: 'test-a@example.test', password: 'test-password' })}>
            Dev: sign in as test user
          </button>
        )
      }
    : () => null

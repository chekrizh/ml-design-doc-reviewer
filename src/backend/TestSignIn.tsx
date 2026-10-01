import { getSupabase } from './supabase'

/**
 * Local-only sign-in that skips Google (docs/backend-spec.md §7). Vite replaces the flag at build
 * time and the whole branch, label and password included, is dropped from a build without
 * VITE_TEST_SIGNIN=true (checked by e2e/m2/auth.spec.ts). Keep the gate and the button in this module.
 */
export const TestSignIn =
  import.meta.env.VITE_TEST_SIGNIN === 'true'
    ? function TestSignIn({ className }: { className: string }) {
        return (
          <button type="button" className={className} onClick={() => void getSupabase()?.auth.signInWithPassword({ email: 'test-a@example.test', password: 'test-password' })}>
            Sign in as test user
          </button>
        )
      }
    : () => null

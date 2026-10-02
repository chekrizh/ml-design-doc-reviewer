import { execFileSync } from 'node:child_process'
import { SUPABASE_URL } from '../global-setup'
import { expect, test } from './fixtures'

const passwordSignIn = (email: string) =>
  fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: process.env.SUPABASE_PUBLISHABLE_KEY!, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'test-password' }),
  })

test('m2-setup-01: local Supabase is up with the seed test users', async () => {
  for (const email of ['test-a@example.test', 'test-b@example.test']) expect((await passwordSignIn(email)).status).toBe(200)
})

test('m2-setup-01: sign-up is closed and the reset helper is service-only', async () => {
  const signup = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: process.env.SUPABASE_PUBLISHABLE_KEY!, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'new@example.test', password: 'test-password' }),
  })
  expect(signup.status).toBe(422)
  const anonReset = await fetch(`${SUPABASE_URL}/rest/v1/rpc/test_reset`, {
    method: 'POST',
    headers: { apikey: process.env.SUPABASE_PUBLISHABLE_KEY! },
  })
  expect(anonReset.status).toBe(401)
})

test('m2-setup-01: global setup fails with a clear message when Supabase is down', () => {
  let out = ''
  try {
    execFileSync('node', ['-e', `import('${process.cwd()}/e2e/global-setup.ts').then((m) => m.default()).catch((e) => { console.log(e.message); process.exit(3) })`], {
      encoding: 'utf8',
      // A closed port stands in for a stopped stack.
      env: { ...process.env, E2E_SUPABASE_URL: 'http://127.0.0.1:1' },
    })
  } catch (e) {
    out = (e as { stdout: string }).stdout
  }
  expect(out).toContain('Local Supabase is not running: run `supabase start`')
})

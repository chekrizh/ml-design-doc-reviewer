import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { build } from 'vite'
import { expect, test } from './fixtures'

test('m2-auth-01: Sign in with Google starts Supabase Google OAuth with PKCE', async ({ page }) => {
  let authorize: URL | undefined
  // Local Supabase has no Google provider: report it as on, stop at the authorize request and inspect it.
  await page.route('http://127.0.0.1:54321/auth/v1/settings', (route) => route.fulfill({ json: { external: { google: true } } }))
  await page.route('http://127.0.0.1:54321/auth/v1/authorize**', (route) => {
    authorize = new URL(route.request().url())
    return route.fulfill({ status: 200, contentType: 'text/html', body: '<p>Google</p>' })
  })
  await page.goto('/')
  await expect(page.getByRole('img', { name: 'Guest' })).toBeVisible()
  await page.locator('header').getByRole('button', { name: 'Sign in with Google' }).click()
  await page.waitForURL('http://127.0.0.1:54321/auth/v1/authorize**')
  await expect(page.getByText('Google', { exact: true })).toBeVisible()
  expect(authorize!.searchParams.get('provider')).toBe('google')
  expect(authorize!.searchParams.get('redirect_to')).toBe('http://localhost:4173/')
  expect(authorize!.searchParams.get('code_challenge_method')).toBe('s256')
})

test('m2-auth-01: Sign in with Google on a server without the Google provider shows a message instead of an error page', async ({ page }) => {
  let authorized = false
  await page.route('http://127.0.0.1:54321/auth/v1/authorize**', (route) => {
    authorized = true
    return route.abort()
  })
  await page.goto('/')
  await page.locator('header').getByRole('button', { name: 'Sign in with Google' }).click()
  await expect(page.getByRole('status')).toContainText('Google sign-in is not set up on this server yet.')
  expect(page.url()).toBe('http://localhost:4173/')
  expect(authorized).toBe(false)
})

test('m2-auth-01: after sign-in the header shows the photo and the account menu; sign out returns to the guest home', async ({ page }) => {
  await page.goto('/local')
  await page.getByRole('button', { name: 'Dev: sign in as test user' }).click()
  const photo = page.getByRole('img', { name: 'Google profile photo' })
  await expect(photo).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sign in with Google' })).toBeHidden()
  await expect(page.getByRole('img', { name: 'Guest' })).toBeHidden()

  await page.reload()
  await expect(photo).toBeVisible()

  await page.getByRole('button', { name: 'Account menu' }).click()
  const menu = page.getByRole('menu', { name: 'Account menu' })
  await expect(menu).toContainText('test-a@example.test')
  await expect(menu.getByRole('menuitem')).toHaveText(['My designs', 'AI Review settings', 'Sign out'])
  await menu.getByRole('menuitem', { name: 'Sign out' }).click()

  await expect(page).toHaveURL('http://localhost:4173/')
  await expect(page.locator('header').getByRole('button', { name: 'Sign in with Google' })).toBeVisible()
  await expect(page.getByRole('img', { name: 'Guest' })).toBeVisible()
  await page.reload()
  await expect(page.locator('header').getByRole('button', { name: 'Sign in with Google' })).toBeVisible()
})

test('m2-auth-01: the production build has no test sign-in', async () => {
  test.setTimeout(120_000)
  const read = async (flag: string | undefined) => {
    const outDir = mkdtempSync(join(tmpdir(), 'prod-build-'))
    const saved = process.env.VITE_TEST_SIGNIN
    if (flag === undefined) delete process.env.VITE_TEST_SIGNIN
    else process.env.VITE_TEST_SIGNIN = flag
    try {
      // envDir: an empty folder, so a developer's .env.local cannot switch the flag on (Vercel has none either).
      await build({ logLevel: 'silent', envDir: mkdtempSync(join(tmpdir(), 'no-env-')), build: { outDir, emptyOutDir: true } })
      return readdirSync(outDir, { recursive: true }).map(String).filter((f) => f.endsWith('.js')).map((f) => readFileSync(join(outDir, f), 'utf8')).join('\n')
    } finally {
      if (saved === undefined) delete process.env.VITE_TEST_SIGNIN
      else process.env.VITE_TEST_SIGNIN = saved
      rmSync(outDir, { recursive: true, force: true })
    }
  }
  const prod = await read(undefined)
  expect(prod).toContain('Sign in with Google')
  expect(prod).not.toContain('Dev: sign in as test user')
  expect(prod).not.toContain('test-password')
  expect(prod).not.toContain('example.test')
  // Sanity: the same check sees the button when the flag is on.
  expect(await read('true')).toContain('Dev: sign in as test user')
})

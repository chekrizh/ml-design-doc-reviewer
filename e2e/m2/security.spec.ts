import { execFileSync } from 'node:child_process'
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { build } from 'vite'
import { VALID_KEY } from '../mocks/openrouter/server'
import { expect, test } from './fixtures'

/** What must never ship: Supabase secret keys (new and legacy service_role), Google client secrets, OpenRouter keys. */
const forbidden = () => [
  process.env.SUPABASE_SECRET_KEY!,
  /sb_secret_[A-Za-z0-9_-]{10,}/,
  // A legacy service_role JWT: its payload base64 contains "service_role".
  /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*c2VydmljZV9yb2xl[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+/,
  /GOCSPX-[A-Za-z0-9_-]+/,
  /sk-or-v1-[A-Za-z0-9_-]{8,}/,
]
const leaks = (text: string) => forbidden().filter((p) => (typeof p === 'string' ? text.includes(p) : p.test(text))).map(String)

test('m2-security-01: the production bundle contains no service-role key, Google client secret or OpenRouter key', async () => {
  test.setTimeout(120_000)
  const outDir = mkdtempSync(join(tmpdir(), 'prod-build-'))
  try {
    await build({ logLevel: 'silent', build: { outDir, emptyOutDir: true } })
    const files = readdirSync(outDir, { recursive: true }).map(String).filter((f) => /\.(js|html|css|json)$/.test(f))
    const all = files.map((f) => readFileSync(join(outDir, f), 'utf8')).join('\n')
    expect(leaks(all)).toEqual([])
  } finally {
    rmSync(outDir, { recursive: true, force: true })
  }
})

test('m2-security-01: no secret in src/, supabase/config.toml, migrations or any committed .env file', () => {
  const tracked = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split('\n').filter(Boolean)
  // Test files may hold the mock's test key on purpose; app and server code may not.
  const checked = tracked.filter(
    (f) => !f.endsWith('.test.ts') && (f.startsWith('src/') || f === 'supabase/config.toml' || f.startsWith('supabase/migrations/') || f.startsWith('supabase/functions/') || /(^|\/)\.env/.test(f)),
  )
  expect(checked.length).toBeGreaterThan(20)
  const found = checked.flatMap((f) => leaks(readFileSync(f, 'utf8')).map((l) => `${f}: ${l}`))
  expect(found).toEqual([])
  // The OpenRouter test key lives only in test code (mocks and specs), never in the app.
  expect(VALID_KEY.startsWith('sk-or-v1-')).toBe(true)
})

import { expect, test } from '@playwright/test'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { createServer } from 'vite'

test('pnpm dev serves the app without console errors', async ({ page }) => {
  const server = await createServer({ server: { port: 5199, strictPort: true }, logLevel: 'silent' })
  await server.listen()
  try {
    const errors: string[] = []
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
    page.on('pageerror', (e) => errors.push(e.message))
    await page.goto('http://localhost:5199/')
    await expect(page.getByRole('button', { name: 'Canvas', exact: true })).toBeVisible()
    expect(errors).toEqual([])
  } finally {
    await server.close()
  }
})

test('build output is a static dist/ with no server code', () => {
  // The Playwright webServer runs `pnpm build && pnpm preview`, so dist/ exists here.
  expect(existsSync('dist/index.html')).toBe(true)
  const files = readdirSync('dist', { recursive: true }).map(String)
  const nonStatic = files.filter((f) => !/\.(html|js|css|svg|png|woff2?|ttf|json|ico|txt)$/.test(f) && !f.match(/^[^.]+$/))
  expect(nonStatic).toEqual([])
  expect(existsSync('api')).toBe(false)
})

test('app code reads no environment variables', () => {
  const src = readdirSync('src', { recursive: true }).map(String).filter((f) => /\.tsx?$/.test(f))
  const offenders = src.filter((f) => readFileSync(`src/${f}`, 'utf8').includes('import.meta.env'))
  expect(offenders).toEqual([])
})

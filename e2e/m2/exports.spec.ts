import type { Page } from '@playwright/test'
import { exportMarkdown, pdfText, readZip, toMode } from '../helpers'
import { stubGoogle } from '../mocks/google/google'
import { expect, openExampleWithKey, reviewPanel, runReview, test } from './fixtures'

const pngInfo = (b64: string) => {
  const buf = Buffer.from(b64, 'base64')
  return { signature: buf.subarray(0, 8).toString('hex'), width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
}

async function driveExport(page: Page) {
  await page.getByRole('button', { name: 'Share', exact: true }).click()
  await page.getByRole('menu', { name: 'Share' }).getByRole('menuitem').first().click()
  await expect(page.getByTestId('toast')).toContainText('Google Doc created')
}

test('m2-export-01: each non-empty diagram is a PNG with the PNG signature and a long side of at most 1600 px, the same in the review and the export', async ({ page }) => {
  const drive = await stubGoogle(page)
  await openExampleWithKey(page)
  await runReview(page)
  await expect(reviewPanel(page).getByTestId('severity-counts')).toContainText('1 critical')
  const { mockOpenRouter } = await import('../mocks/openrouter/server')
  const sent = await mockOpenRouter.lastRequest()
  const reviewImages: string[] = sent.body.messages[1].content.filter((p: { type: string }) => p.type === 'image_url').map((p: { image_url: { url: string } }) => p.image_url.url.split(',')[1])
  expect(reviewImages).toHaveLength(3)
  for (const im of reviewImages) {
    const info = pngInfo(im)
    expect(info.signature).toBe('89504e470d0a1a0a')
    expect(Math.max(info.width, info.height)).toBeLessThanOrEqual(1600)
    expect(Math.min(info.width, info.height)).toBeGreaterThan(50)
  }
  await driveExport(page)
  const exported = [...drive[0].body.matchAll(/data:image\/png;base64,([A-Za-z0-9+/=]+)/g)].map((m) => m[1])
  expect(exported).toEqual(reviewImages)
})

test('m2-review-12: findings stay out of Markdown, PDF and Google Docs exports', async ({ page }) => {
  const drive = await stubGoogle(page)
  await openExampleWithKey(page)
  await runReview(page)
  await expect(reviewPanel(page).getByTestId('severity-counts')).toContainText('1 critical')
  const banned = [
    'Average check does not measure the stated goal',
    'Split by distribution center leaves too few units',
    'Control metrics have no thresholds',
    'Out-of-stock is called costlier',
    'Antigoals are not stated',
    'What the design says',
    'Why it matters',
    'Show fix',
  ]
  const { download } = await exportMarkdown(page, 'none')
  const zip = await readZip(download!)
  const md = await zip.file(Object.keys(zip.files).find((f) => f.endsWith('.md'))!)!.async('string')
  for (const b of banned) expect(md).not.toContain(b)

  await driveExport(page)
  for (const b of banned) expect(drive[0].body).not.toContain(b)

  await page.addInitScript(() => (window.print = () => {}))
  await toMode(page, 'Document')
  await page.emulateMedia({ media: 'print' })
  const pdf = await pdfText(page)
  for (const b of banned) expect(pdf).not.toContain(b)
  expect(pdf).toContain('Supermegaretail Demand Forecasting')
})

import type { Page } from '@playwright/test'
import { loadExample, reload } from '../helpers'
import { stubGoogle } from '../mocks/google/google'
import { expect, openExampleWithKey, signedInClient, test } from './fixtures'

const toast = (page: Page) => page.getByTestId('toast')

async function exportGdocs(page: Page) {
  await page.getByRole('button', { name: 'Share', exact: true }).click()
  const items = page.getByRole('menu', { name: 'Share' }).getByRole('menuitem')
  await expect(items.first()).toContainText('Export to Google Docs')
  await items.first().click()
}

const SECTIONS = ['Problem Space', 'Evaluation (Offline)', 'Baseline', 'Validation', 'Data &amp; Features', 'Evaluation (Online)', 'Integration', 'Monitoring', 'Target Solution &amp; Architecture']

async function checkExports(page: Page, requests: Awaited<ReturnType<typeof stubGoogle>>) {
  // Share: Google Docs first, with its subtitle, then PDF and Markdown.
  await page.getByRole('button', { name: 'Share', exact: true }).click()
  await expect(page.getByRole('menu', { name: 'Share' }).getByRole('menuitem')).toHaveText(['Export to Google DocsCreates a new Google Doc in your Drive', 'Export PDF', 'Export Markdown'])
  await page.keyboard.press('Escape')

  await exportGdocs(page)
  await expect(toast(page)).toContainText('Google Doc created')
  await expect(toast(page).getByRole('button', { name: 'Open' })).toBeVisible()
  await expect(toast(page).getByRole('button', { name: 'Copy link' })).toBeVisible()
  expect(requests).toHaveLength(1)
  const [r] = requests
  expect(r.kind).toBe('create')
  expect(r.contentType).toMatch(/^multipart\/related; boundary=/)
  expect(r.body).toContain('"mimeType":"application/vnd.google-apps.document"')
  expect(r.body).toContain('Supermegaretail Demand Forecasting')
  SECTIONS.forEach((name, i) => expect(r.body).toContain(`<h2>${i + 1}. ${name}</h2>`))
  expect(r.body.match(/data:image\/png;base64,/g)).toHaveLength(3)
  expect(r.body).not.toMatch(/<svg|image\/svg/)

  // A second export creates another file; nothing is updated. Share shows the last export.
  await exportGdocs(page)
  await expect.poll(() => requests.length).toBe(2)
  expect(requests.map((x) => x.kind)).toEqual(['create', 'create'])
  await page.getByRole('button', { name: 'Share', exact: true }).click()
  await expect(page.getByTestId('last-export')).toContainText(/Last exported today, \d\d:\d\d/)
  await expect(page.getByTestId('last-export').getByRole('link', { name: 'Open' })).toHaveAttribute('href', /docs\.google\.com\/document\/d\/mock-doc-2/)
  await page.keyboard.press('Escape')
}

test('m2-export-02: a guest exports the example to Google Docs; every export is a new file; the last export survives reload', async ({ page }) => {
  const requests = await stubGoogle(page)
  await page.goto('/local')
  await loadExample(page)
  await checkExports(page, requests)
  await reload(page)
  await page.getByRole('button', { name: 'Share', exact: true }).click()
  await expect(page.getByTestId('last-export')).toContainText('Last exported')
})

test('m2-export-02: a signed-in export records last_export without a new version', async ({ page }) => {
  const requests = await stubGoogle(page)
  const id = await openExampleWithKey(page)
  await checkExports(page, requests)
  const db = await signedInClient()
  const row = (await db.from('designs').select('last_export, version').eq('id', id).single()).data!
  expect(row.last_export.url).toContain('mock-doc-2')
  expect(row.version).toBe(1)
  await page.reload()
  await page.getByRole('button', { name: 'Share', exact: true }).click()
  await expect(page.getByTestId('last-export')).toContainText('Last exported')
})

test('m2-export-02: denied access, a blocked popup and a Drive failure show errors with Try again; a 401 asks for a token once more', async ({ page }) => {
  let requests = await stubGoogle(page, { gis: 'deny' })
  await page.goto('/local')
  await loadExample(page)
  await exportGdocs(page)
  await expect(toast(page)).toContainText('Nothing was exported')
  await expect(toast(page).getByRole('button', { name: 'Try again' })).toBeVisible()
  expect(requests).toHaveLength(0)

  await page.unrouteAll()
  await page.reload()
  requests = await stubGoogle(page, { gis: 'popup_blocked' })
  await exportGdocs(page)
  await expect(toast(page)).toContainText('blocked the Google window')
  expect(requests).toHaveLength(0)

  await page.unrouteAll()
  await page.reload()
  const failed = await stubGoogle(page, { drive: 'fail' })
  await exportGdocs(page)
  await expect(toast(page)).toContainText('Google Drive did not accept the document')
  expect(failed).toHaveLength(1)
  await expect(toast(page)).toContainText('PDF and Markdown export still work')

  await page.unrouteAll()
  await page.reload()
  requests = await stubGoogle(page, { drive: 'unauthorized_once' })
  await exportGdocs(page)
  await expect(toast(page)).toContainText('Google Doc created')
  expect(requests).toHaveLength(2)
})

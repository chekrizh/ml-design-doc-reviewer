import { expect, test } from '@playwright/test'
import { collectCspViolations } from './csp'
import { closeEditor, drawRectangle, loadExample, menuAction, openDetails, toMode } from './helpers'

// D37: the guest flows run under the production CSP and headers without a single violation.
test('csp-01 home, canvas, whiteboard, document and exports work under the production CSP', async ({ page, context }) => {
  const violations = await collectCspViolations(context)
  const res = await page.goto('/')
  expect(res!.headers()['content-security-policy']).toContain("frame-ancestors 'none'")
  expect(res!.headers()['x-content-type-options']).toBe('nosniff')
  await page.goto('/local')
  await loadExample(page)
  await expect(page.getByTestId('card-integration').getByTestId('thumbnail').locator('img')).toBeVisible()
  await openDetails(page, 'validation')
  await drawRectangle(page)
  // Excalidraw's fonts come from the app, not the blocked esm.sh fallback.
  await expect
    .poll(() => page.evaluate(() => [...document.fonts].some((f) => f.family.includes('Excalifont') && f.status === 'loaded')))
    .toBe(true)
  await closeEditor(page)
  await toMode(page, 'Document')
  await expect(page.getByTestId('document')).toContainText('Supermegaretail')
  const download = page.waitForEvent('download')
  await menuAction(page, 'Share', 'Export Markdown')
  await download
  expect([...new Set(violations)]).toEqual([])
})

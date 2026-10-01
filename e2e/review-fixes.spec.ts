import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { answerDialog, dialog, docSection, loadExample, openApp, openDetails, setCardValue, menuAction, toMode } from './helpers'

// Regression tests for the code review of the M1 run (R<n> = finding n).

test('R1 the app still opens when IndexedDB is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    IDBFactory.prototype.open = () => {
      throw new Error('storage blocked')
    }
  })
  await openApp(page)
  await expect(page.getByTestId('header-save-state')).toHaveText('Not saved')
})

test('R2 a failed save is reported instead of staying on Saving…', async ({ page }) => {
  await page.addInitScript(() => {
    IDBObjectStore.prototype.put = () => {
      throw new DOMException('full', 'QuotaExceededError')
    }
  })
  await openApp(page)
  await setCardValue(page, 'monitoring', 'Data Drift', 'PSI < 0.2')
  await expect(page.getByTestId('header-save-state')).toHaveText('Not saved')
})

test('R4 the document rationale follows Load example instead of overwriting it', async ({ page }) => {
  await openApp(page)
  await loadExample(page)
  await toMode(page, 'Document')
  const r = docSection(page, 'integration').getByRole('textbox', { name: 'Integration rationale' })
  await r.click()
  await page.keyboard.press('ControlOrMeta+End')
  await page.keyboard.type(' Stale')
  await expect(r).toContainText('Stale')

  await loadExample(page)
  await expect(r).not.toContainText('Stale')
  await r.click()
  await page.keyboard.press('ControlOrMeta+End')
  await page.keyboard.type(' Fresh')

  await toMode(page, 'Canvas')
  await openDetails(page, 'integration')
  const editor = dialog(page).getByRole('textbox', { name: 'Rationale' })
  await expect(editor).toContainText('Fresh')
  await expect(editor).not.toContainText('Stale')
})

test('R5 clearing the rationale in the document keeps the editor for retyping', async ({ page }) => {
  await openApp(page)
  await loadExample(page)
  await toMode(page, 'Document')
  const r = docSection(page, 'integration').getByRole('textbox', { name: 'Integration rationale' })
  await r.click()
  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.press('Backspace')
  await page.keyboard.type('Rewritten')
  await expect(r).toHaveText('Rewritten')
})

test('R6 Export PDF prints only after the diagram images are in the document', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { printedImages: number }
    w.printedImages = -1
    window.print = () => {
      w.printedImages = document.querySelectorAll('[data-testid="document"] img').length
    }
  })
  await openApp(page)
  // Slow down lazy chunks (Excalidraw) so a cold first export is reproducible.
  await page.route('**/*.js', async (route) => {
    await new Promise((r) => setTimeout(r, 1000))
    await route.continue()
  })
  await loadExample(page)
  const diagrams = await page.getByTestId('thumbnail').count()
  expect(diagrams).toBeGreaterThan(0)

  await menuAction(page, 'Share', 'Export PDF')
  const printed = () => page.evaluate(() => (window as unknown as { printedImages: number }).printedImages)
  await expect.poll(printed, { timeout: 15_000 }).toBeGreaterThanOrEqual(0)
  expect(await printed()).toBe(diagrams)
})

// Retrying after a failed render is covered by src/export/svg.test.ts. In the browser a
// dynamic import that failed to load stays failed until reload, so here each attempt
// must at least report the failure instead of doing nothing.
test('R7/R8 a failed diagram render during Markdown export is reported on every attempt', async ({ page }) => {
  // Block every lazy chunk (Excalidraw) from the start: the default diagrams of a new design would load it on open.
  // Only the scripts index.html loads up front get through.
  const entry = new Set(readFileSync('dist/index.html', 'utf8').match(/assets\/[^"]+\.js/g))
  await page.route('**/assets/*.js', (route) => (entry.has(new URL(route.request().url()).pathname.slice(1)) ? route.continue() : route.abort()))
  await openApp(page)
  await loadExample(page)

  for (let attempt = 0; attempt < 2; attempt++) {
    await menuAction(page, 'Share', 'Export Markdown')
    expect(await answerDialog(page, 'OK')).toMatch(/Export failed/)
  }
})

test('M1.1-R1 a long document title wraps instead of being cut with an ellipsis', async ({ page }) => {
  await openApp(page)
  await toMode(page, 'Document')
  const title = 'Real-time fraud detection for card payments across all regions and merchant categories'
  await page.getByRole('button', { name: 'Edit Document title' }).click()
  await page.getByRole('textbox', { name: 'Document title' }).fill(title)
  await page.getByRole('textbox', { name: 'Document title' }).press('Enter')
  const shown = page.getByRole('button', { name: 'Edit Document title' })
  await expect(shown).toHaveText(title)
  const { clipped, lines } = await shown.evaluate((e) => ({
    clipped: e.scrollWidth > e.clientWidth,
    lines: Math.round(e.getBoundingClientRect().height / parseFloat(getComputedStyle(e).lineHeight)),
  }))
  expect(clipped).toBe(false)
  expect(lines).toBeGreaterThan(1)
})


import { expect, test, type Page } from '@playwright/test'
import { answerDialog, card, cardBox, docSection, dragCard, loadExample, menuAction, openApp, resizeCard, toMode } from '../helpers'

const ROWS = [
  ['problem-space', 'evaluation-offline', 'baseline'],
  ['validation', 'data-features', 'target-solution'],
  ['evaluation-online', 'monitoring', 'integration'],
] as const

/** Three rows of three cards, widths 4 : 3 : 5, each row from the left edge to the right edge. */
async function expectDefaultLayout(page: Page) {
  await expect
    .poll(async () => {
      const area = (await page.locator('.react-grid-layout').boundingBox())!
      const col = (area.width - 11 * 16) / 12
      const width = (n: number) => n * col + (n - 1) * 16
      for (const row of ROWS) {
        const b = await Promise.all(row.map((sid) => cardBox(page, sid)))
        if (b.some((x) => Math.abs(x.y - b[0].y) > 2)) return `${row} not in one row`
        if ([4, 3, 5].some((n, k) => Math.abs(b[k].w - width(n)) > 2)) return `${row} widths ${b.map((x) => x.w)}`
        if (Math.abs(b[0].x - area.x) > 2 || Math.abs(b[2].x + b[2].w - (area.x + area.width)) > 2) return `${row} not edge to edge`
      }
      const ys = await Promise.all(ROWS.map((row) => cardBox(page, row[0]).then((b) => b.y)))
      return ys[0] < ys[1] && ys[1] < ys[2] ? 'ok' : `row order ${ys}`
    })
    .toBe('ok')
}

test('AT-21 default layout: on open, after Reset layout, Load example and Clear design', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await openApp(page)
  // 1.
  await expectDefaultLayout(page)
  // 2.
  for (const sid of ['validation', 'target-solution', 'integration'] as const)
    await expect(card(page, sid).getByTestId('default-diagram').getByRole('img')).toBeVisible()
  await toMode(page, 'Document')
  for (const sid of ['validation', 'target-solution', 'integration'] as const)
    await expect(docSection(page, sid).getByText('Not filled yet')).toBeVisible()
  await toMode(page, 'Canvas')
  // 3.
  await resizeCard(page, 'problem-space', 150, 0)
  await dragCard(page, 'monitoring', 'problem-space')
  await expect.poll(async () => (await cardBox(page, 'monitoring')).y).toBe((await cardBox(page, 'problem-space')).y)
  await menuAction(page, 'More', 'Reset layout')
  await expectDefaultLayout(page)
  // 4.
  await resizeCard(page, 'problem-space', 150, 0)
  await loadExample(page)
  await expectDefaultLayout(page)
  await resizeCard(page, 'problem-space', 150, 0)
  await menuAction(page, 'More', 'Clear design')
  await answerDialog(page, 'Clear design')
  await expect(card(page, 'problem-space').getByRole('button', { name: 'Edit Domain' })).toHaveText('Not set')
  await expectDefaultLayout(page)
})

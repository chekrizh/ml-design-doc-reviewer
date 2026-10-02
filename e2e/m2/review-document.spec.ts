import { toMode } from '../helpers'
import { expect, openExampleWithKey, reviewPanel, runReview, test } from './fixtures'

test('m2-review-10: margin comments sit at their fields without overlapping; the expanded one aligns with its highlighted field', async ({ page }) => {
  await openExampleWithKey(page)
  await runReview(page)
  await expect(reviewPanel(page).getByTestId('severity-counts')).toContainText('1 critical')
  await toMode(page, 'Document')
  const comments = page.getByTestId('comment')
  await expect(comments).toHaveCount(5)
  const sheet = (await page.getByTestId('document').boundingBox())!
  const boxes = await comments.evaluateAll((els) => els.map((e) => e.getBoundingClientRect()).map((r) => ({ x: r.x, y: r.y, h: r.height })))
  for (const b of boxes) expect(b.x).toBeGreaterThanOrEqual(sheet.x + sheet.width)
  const sorted = [...boxes].sort((a, b) => a.y - b.y)
  for (let i = 1; i < sorted.length; i++) expect(sorted[i].y).toBeGreaterThanOrEqual(sorted[i - 1].y + sorted[i - 1].h)

  // The whole-design comment at the document title, above the others.
  const title = (await page.locator('[data-field="design"]').boundingBox())!
  const whole = comments.filter({ hasText: 'Out-of-stock is called costlier' })
  expect(Math.abs((await whole.boundingBox())!.y - title.y)).toBeLessThanOrEqual(4)
  expect((await whole.boundingBox())!.y).toBe(sorted[0].y)

  // Expanding aligns it with Key Metric in Evaluation (Online) and highlights the field.
  const avg = comments.filter({ hasText: 'Average check does not measure' })
  await avg.getByRole('button', { expanded: false }).click()
  await expect(avg).toContainText('What the design says')
  const field = page.locator('[data-field="evaluation-online:kp:evaluation-online-p1"]')
  await expect(field).toHaveAttribute('data-hl', '')
  await expect.poll(async () => Math.abs((await avg.boundingBox())!.y - (await field.boundingBox())!.y)).toBeLessThanOrEqual(4)
})

test('m2-review-10: tabs Open / Resolved / Dismissed in the document', async ({ page }) => {
  await openExampleWithKey(page)
  await runReview(page)
  await expect(reviewPanel(page).getByTestId('severity-counts')).toContainText('1 critical')
  await toMode(page, 'Document')
  const aside = page.getByRole('complementary', { name: 'Comments' })
  await expect(aside.getByRole('tab', { name: 'Open 5' })).toHaveAttribute('aria-selected', 'true')
  const c = page.getByTestId('comment').filter({ hasText: 'Antigoals are not stated' })
  await c.getByRole('button', { expanded: false }).click()
  await c.getByRole('button', { name: 'Resolve' }).click()
  await expect(page.getByTestId('comment')).toHaveCount(4)
  await aside.getByRole('tab', { name: 'Resolved 1' }).click()
  await expect(page.getByTestId('comment')).toHaveCount(1)
  await expect(page.getByTestId('comment').getByRole('button', { name: 'Reopen' })).toBeVisible()
})

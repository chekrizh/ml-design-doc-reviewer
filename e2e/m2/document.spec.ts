import { loadExample, toMode } from '../helpers'
import { expect, test } from './fixtures'

test('m2-doc-01: the outline is left of the sheet and the comments column right of it, without a review too', async ({ page }) => {
  await page.goto('/local')
  for (const withExample of [false, true]) {
    if (withExample) {
      await toMode(page, 'Canvas')
      await loadExample(page)
    }
    await toMode(page, 'Document')
    const outline = (await page.getByRole('navigation', { name: 'On this page' }).boundingBox())!
    const sheet = (await page.getByTestId('document').boundingBox())!
    const comments = (await page.getByRole('complementary', { name: 'Comments' }).boundingBox())!
    expect(outline.x + outline.width).toBeLessThanOrEqual(sheet.x)
    expect(comments.x).toBeGreaterThanOrEqual(sheet.x + sheet.width)
    expect(comments.width).toBeGreaterThan(250)
    expect(comments.x + comments.width).toBeLessThanOrEqual(1440)
  }
  // The outline keeps its M1 look: active item in indigo.
  await expect(page.getByRole('navigation', { name: 'On this page' }).locator('[aria-current="location"]')).toHaveClass(/bg-indigo-100/)
})

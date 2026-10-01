import { card, loadExample } from '../helpers'
import { expect, test } from './fixtures'

test('m2-lib-02: after Load example exactly Validation, Data & Features and Integration show a thumbnail; Target Solution keeps the default diagram', async ({ page }) => {
  await page.goto('/local')
  await loadExample(page)
  await expect(page.getByTestId('thumbnail')).toHaveCount(3)
  for (const sid of ['validation', 'data-features', 'integration'] as const) await expect(card(page, sid).getByTestId('thumbnail').locator('img')).toBeVisible()
  await expect(card(page, 'target-solution').getByTestId('default-diagram')).toBeVisible()
  await expect(page.getByTestId('default-diagram')).toHaveCount(1)
})

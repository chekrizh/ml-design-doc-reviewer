import { expect, test } from '@playwright/test'
import { card, loadExample, openDetails, setCardValue, toMode } from './helpers'

test('ui-01 below 1280px shows Open on desktop instead of the editor', async ({ page }) => {
  await page.setViewportSize({ width: 1279, height: 800 })
  await page.goto('/local')
  await expect(page.getByRole('heading', { name: 'Open on desktop' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Canvas', exact: true })).toBeHidden()
  await expect(page.getByTestId('card-problem-space')).toBeHidden()
})

test('ui-01 at 1280px the app works normally', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/local')
  await expect(page.getByRole('heading', { name: 'Open on desktop' })).toBeHidden()
  await setCardValue(page, 'problem-space', 'Domain', 'Payments')
  await expect(card(page, 'problem-space').getByRole('button', { name: 'Edit Domain' })).toHaveText('Payments')
  await toMode(page, 'Document')
  await expect(page.getByTestId('document')).toContainText('Payments')
})

test('ui-02 screenshots of canvas, component editor and document with the example', async ({ page }) => {
  await page.goto('/local')
  await loadExample(page)
  await expect(card(page, 'target-solution').getByTestId('thumbnail').locator('img')).toBeVisible()
  await page.screenshot({ path: 'e2e/screenshots/canvas.png', fullPage: true })
  await openDetails(page, 'target-solution')
  await page.waitForTimeout(1000)
  await page.screenshot({ path: 'e2e/screenshots/component-editor.png' })
  await page.keyboard.press('Escape')
  await toMode(page, 'Document')
  await expect(page.getByRole('img', { name: 'Validation diagram' })).toBeVisible()
  await page.screenshot({ path: 'e2e/screenshots/document.png' })
})

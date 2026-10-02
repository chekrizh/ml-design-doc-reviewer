import { expect, test } from '@playwright/test'
import { card, closeEditor, loadExample, openDetails, setCardValue, toMode } from './helpers'

// Responsive layout (D34): no desktop-only gate; every screen fits the window without a horizontal scroll.
for (const width of [375, 768, 1024, 1280])
  test(`responsive at ${width}px: canvas, editor and document fit the window and work`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 })
    const noSideScroll = async () => expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
    await page.goto('/')
    await noSideScroll()
    await page.goto('/local')
    await loadExample(page)
    await noSideScroll()
    await setCardValue(page, 'problem-space', 'Domain', 'Payments')
    await expect(card(page, 'problem-space').getByRole('button', { name: 'Edit Domain' })).toHaveText('Payments')
    await openDetails(page, 'problem-space')
    await noSideScroll()
    await closeEditor(page)
    await toMode(page, 'Document')
    await expect(page.getByTestId('document')).toContainText('Payments')
    await noSideScroll()
  })

test('ui-02 screenshots of canvas, component editor and document with the example', async ({ page }) => {
  await page.goto('/local')
  await loadExample(page)
  await expect(card(page, 'integration').getByTestId('thumbnail').locator('img')).toBeVisible()
  await page.screenshot({ path: 'e2e/screenshots/canvas.png', fullPage: true })
  await openDetails(page, 'integration')
  await page.waitForTimeout(1000)
  await page.screenshot({ path: 'e2e/screenshots/component-editor.png' })
  await page.keyboard.press('Escape')
  await toMode(page, 'Document')
  await expect(page.getByRole('img', { name: 'Validation diagram' })).toBeVisible()
  await page.screenshot({ path: 'e2e/screenshots/document.png' })
})

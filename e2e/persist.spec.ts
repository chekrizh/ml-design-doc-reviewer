import { expect, test } from '@playwright/test'
import { card, closeEditor, drawRectangle, indicator, loadExample, openApp, openDetails, reload, setCardValue, setTitle, SECTION_ORDER } from './helpers'

test('persist-01 key property value survives reload', async ({ page }) => {
  await openApp(page)
  await setCardValue(page, 'problem-space', 'Domain', 'Payments')
  await reload(page)
  await expect(card(page, 'problem-space').getByRole('button', { name: 'Edit Domain' })).toHaveText('Payments')
})

test('persist-01 drawing survives reload', async ({ page }) => {
  await openApp(page)
  await openDetails(page, 'validation')
  await drawRectangle(page)
  await closeEditor(page)
  await expect(card(page, 'validation').getByTestId('thumbnail').locator('img')).toBeVisible()
  await reload(page)
  await expect(card(page, 'validation').getByTestId('thumbnail').locator('img')).toBeVisible()
})

test('persist-01 first visit shows the empty design', async ({ page }) => {
  await openApp(page)
  await expect(page.getByRole('button', { name: 'Edit Design title' })).toHaveText('Untitled design')
  for (const [sid] of SECTION_ORDER) {
    const c = card(page, sid)
    const values = await c.getByRole('button', { name: /^Edit / }).allTextContents()
    expect(values.every((v) => v === 'Not set')).toBe(true)
    await expect(indicator(c, 'Trade-offs')).toHaveAttribute('data-state', 'off')
    await expect(c.getByTestId('thumbnail')).toHaveCount(0)
  }
})

test('persist-02 load example asks for confirmation; cancel keeps, confirm loads', async ({ page }) => {
  await openApp(page)
  await setTitle(page, 'Mine')
  let message = ''
  page.once('dialog', (d) => {
    message = d.message()
    void d.dismiss()
  })
  await page.getByRole('button', { name: 'Load example' }).click()
  expect(message).toContain('replaces your current design')
  await expect(page.getByRole('button', { name: 'Edit Design title' })).toHaveText('Mine')
  await loadExample(page)
  await expect(card(page, 'problem-space').getByRole('button', { name: 'Edit Domain' })).toHaveText('Telecom (Prepaid)')
  await expect(page.locator('[data-indicator="Trade-offs"][data-state="on"]')).toHaveCount(4)
  await expect(page.getByTestId('thumbnail')).toHaveCount(2)
})

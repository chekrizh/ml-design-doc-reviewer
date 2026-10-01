import { reload, setCardValue, card, waitSaved } from '../helpers'
import { expect, test } from './fixtures'

const editor = (page: import('@playwright/test').Page) => page.getByRole('button', { name: 'Canvas', exact: true })

test('m2-setup-04: /, /local and back/forward on the History API', async ({ page }) => {
  await page.goto('/')
  await expect(editor(page)).toBeHidden()
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page).toHaveURL(/\/local$/)
  await setCardValue(page, 'problem-space', 'Domain', 'Payments')
  await waitSaved(page)

  await page.getByRole('link', { name: 'ML System Design Trainer: home' }).click()
  await expect(page).toHaveURL(/:\d+\/$/)
  await expect(editor(page)).toBeHidden()

  await page.goBack()
  await expect(page).toHaveURL(/\/local$/)
  await expect(card(page, 'problem-space')).toContainText('Payments')
  await page.goBack()
  await expect(page).toHaveURL(/:\d+\/$/)
  await page.goForward()
  await expect(card(page, 'problem-space')).toContainText('Payments')
})

test('m2-setup-04: reloading /local opens the same guest design; unknown paths go home', async ({ page }) => {
  await page.goto('/local')
  await setCardValue(page, 'problem-space', 'Domain', 'Payments')
  await reload(page)
  await expect(page).toHaveURL(/\/local$/)
  await expect(card(page, 'problem-space')).toContainText('Payments')

  await page.goto('/no/such/page')
  await expect(page).toHaveURL(/:\d+\/$/)
  await expect(page.getByRole('heading', { name: 'Design a system' })).toBeVisible()
})

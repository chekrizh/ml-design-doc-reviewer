import { answerDialog, card, setTitle, toMode, waitSaved, SECTION_ORDER, docSection, menuAction } from '../../helpers'
import { expect, test } from '../../m2/fixtures'
import { home, region, titleOf, value } from './setup'

test('AT-22 guest home screen', async ({ page }) => {
  await page.goto('/')
  // 1. Three sections; the page does not scroll: Your designs ends inside the window.
  for (const name of ['Design a system', 'Examples', 'Your designs']) await expect(region(page, name)).toBeVisible()
  const yours = (await region(page, 'Your designs').boundingBox())!
  expect(yours.y + yours.height).toBeLessThanOrEqual(900)
  expect(await page.evaluate(() => document.scrollingElement!.scrollHeight <= innerHeight)).toBe(true)
  // 2. Your own problem with New design; SuperPay with Start task, ML Task 'Your first decision'.
  const design = region(page, 'Design a system')
  await expect(design.getByRole('article', { name: 'Your own problem' }).getByRole('button', { name: 'New design' })).toBeVisible()
  const task = design.getByRole('article', { name: 'SuperPay Real-Time Fraud Detection' })
  await expect(task.getByRole('button', { name: 'Start task' })).toBeVisible()
  await expect(task.locator('dt', { hasText: 'ML Task' }).locator('+ dd')).toHaveText('Your first decision')
  // 3. Examples: Supermegaretail with Open example and a Source line.
  const ex = region(page, 'Examples').getByRole('article', { name: 'Supermegaretail Demand Forecasting' })
  await expect(ex.getByRole('button', { name: 'Open example' })).toBeVisible()
  await expect(ex.getByText(/^Source:/)).toBeVisible()
  // 4. Your designs: the sign-in line, no Current work.
  await expect(region(page, 'Your designs')).toContainText('Sign in to keep several designs and run AI review')
  await expect(page.getByText('Current work · in this browser')).toHaveCount(0)
  await expect(page.getByTestId('current-work')).toHaveCount(0)
  // 5. Header: Sign in with Google and the guest avatar.
  const header = page.locator('header').first()
  await expect(header.getByRole('button', { name: 'Sign in with Google' })).toBeVisible()
  await expect(header.getByRole('img', { name: 'Guest' })).toBeVisible()
})

test('AT-23 guest: current work and replacing it', async ({ page }) => {
  await page.goto('/')
  // 1. New design, rename to Mine, back home → Current work · in this browser with Mine; Continue opens it.
  await page.getByRole('button', { name: 'New design' }).click()
  await setTitle(page, 'Mine')
  await waitSaved(page)
  await home(page)
  const current = page.getByTestId('current-work')
  await expect(current).toContainText('Current work · in this browser')
  await expect(current).toContainText('Mine')
  await current.getByRole('button', { name: 'Continue' }).click()
  await expect(titleOf(page)).toHaveText('Mine')
  // 2. Open example → 'Replace your current work?'; Cancel keeps Mine.
  await home(page)
  await page.getByRole('button', { name: 'Open example' }).click()
  await expect(page.getByRole('alertdialog').getByRole('heading', { name: 'Replace your current work?' })).toBeVisible()
  await answerDialog(page, 'Cancel')
  await expect(page.getByTestId('current-work')).toContainText('Mine')
  // 3. Open example, confirm → Supermegaretail is open; Current work shows it; Mine is nowhere.
  await page.getByRole('button', { name: 'Open example' }).click()
  await answerDialog(page, 'Open example')
  await expect(titleOf(page)).toHaveText('Supermegaretail Demand Forecasting')
  await home(page)
  await expect(page.getByTestId('current-work')).toContainText('Supermegaretail Demand Forecasting')
  await expect(page.getByText('Mine', { exact: true })).toHaveCount(0)
})

test('AT-24 task from the Library', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start task' }).click()
  await expect(titleOf(page)).toHaveText('SuperPay Real-Time Fraud Detection')
  await expect(value(page, 'problem-space', 'Domain')).toHaveText('High-volume payment risk management')
  await expect(value(page, 'problem-space', 'ML Task')).toHaveText('Not set')
  await toMode(page, 'Document')
  for (const [sid] of SECTION_ORDER) {
    if (sid === 'problem-space') await expect(docSection(page, sid)).not.toContainText('Not filled yet')
    else await expect(docSection(page, sid).getByText(/Not filled yet/)).toBeVisible()
  }
})

test('AT-25 Load example: Supermegaretail', async ({ page }) => {
  await page.goto('/local')
  await setTitle(page, 'Mine')
  await menuAction(page, 'More', 'Load example')
  await answerDialog(page, 'Load example')
  await expect(titleOf(page)).toHaveText('Supermegaretail Demand Forecasting')
  for (const [sid] of SECTION_ORDER) {
    const values = await card(page, sid).getByRole('button', { name: /^Edit / }).allInnerTexts()
    expect(values.length, sid).toBeGreaterThan(0)
    for (const v of values) expect(v, sid).not.toBe('Not set')
  }
  await expect(page.locator('[data-indicator="Trade-offs"][data-state="on"]')).toHaveCount(7)
  await expect(page.getByTestId('thumbnail')).toHaveCount(3)
  for (const sid of ['validation', 'data-features', 'integration'] as const) await expect(card(page, sid).getByTestId('thumbnail').locator('img')).toBeVisible()
})

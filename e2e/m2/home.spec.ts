import type { Page } from '@playwright/test'
import { answerDialog, card, setCardValue, setTitle, waitSaved } from '../helpers'
import { createCloudDesign, expect, serviceInsert, signedInClient, signInAsTestUser, TEST_A, test } from './fixtures'

const section = (page: Page, name: string) => page.getByRole('region', { name })
const galleryCard = (page: Page, title: string) => page.getByRole('article', { name: title })
const rows = (page: Page) => section(page, 'Your designs').getByTestId('design-row')
const titleText = (page: Page) => page.getByRole('button', { name: 'Edit Design title' })
const domain = (page: Page) => card(page, 'problem-space').getByRole('button', { name: 'Edit Domain' })

async function signInHome(page: Page) {
  await page.goto('/')
  await signInAsTestUser(page)
}

test('m2-home-01: galleries share one row, Your designs fills the rest and scrolls inside; the page never scrolls', async ({ page }) => {
  for (let i = 0; i < 14; i++) await createCloudDesign(`Design ${i}`)
  await signInHome(page)
  await expect(rows(page)).toHaveCount(14)
  const [a, b, c] = await Promise.all(['Design a system', 'Examples', 'Your designs'].map((n) => section(page, n).boundingBox()))
  expect(Math.abs(a!.y - b!.y)).toBeLessThan(2)
  expect(b!.x).toBeGreaterThan(a!.x + a!.width - 1)
  expect(c!.y).toBeGreaterThan(a!.y + a!.height)
  expect(c!.y + c!.height).toBeLessThanOrEqual(900)
  const scroll = await page.evaluate(() => ({ page: document.scrollingElement!.scrollHeight, view: innerHeight }))
  expect(scroll.page).toBeLessThanOrEqual(scroll.view)
  const list = section(page, 'Your designs').locator('.overflow-y-auto')
  expect(await list.evaluate((e) => e.scrollHeight > e.clientHeight)).toBe(true)
})

test('m2-home-02: gallery cards show the Problem Space preview, title, sentence, chip and action', async ({ page }) => {
  await page.goto('/')
  const blank = galleryCard(page, 'Your own problem')
  await expect(blank).toContainText('Describe the problem, then make every decision yourself.')
  await expect(blank.getByText('Blank', { exact: true })).toBeVisible()
  await expect(blank.locator('dt')).toHaveText(['Domain', 'Goal', 'Constraints', 'ML Task'])

  const task = galleryCard(page, 'SuperPay Real-Time Fraud Detection')
  await expect(task.locator('dd')).toHaveText(['High-volume payment risk management', 'Net loss from ≈0.4% to ≤0.25% of GMV in 12 months', '≤200 ms, 1000 TPS peak, pilot in 6 months, GDPR', 'Your first decision'])
  await expect(task).toContainText('Replace a rule engine with fraud scoring in under 200 ms.')
  await expect(task.getByText('Task', { exact: true })).toBeVisible()
  await expect(task.getByRole('button', { name: 'Start task' })).toBeVisible()

  const ex = galleryCard(page, 'Supermegaretail Demand Forecasting')
  await expect(ex.locator('dd').first()).toHaveText('Retail, grocery chain')
  await expect(ex).toContainText('A complete design with 7 trade-off matrices and 3 diagrams.')
  await expect(ex.getByText(/^Source:/)).toContainText('ML System Design · MIT')
  await expect(ex.getByRole('link', { name: 'ML System Design · MIT' })).toHaveAttribute('href', /github\.com\/ML-SystemDesign/)
  await expect(ex.getByText('Example', { exact: true })).toBeVisible()
})

test('m2-home-02: New design, Start task and Open example open the matching design (guest)', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'New design' }).click()
  await expect(page).toHaveURL(/\/local$/)
  await expect(titleText(page)).toHaveText('Untitled design')

  await page.goto('/')
  await page.getByRole('button', { name: 'Start task' }).click()
  await expect(titleText(page)).toHaveText('SuperPay Real-Time Fraud Detection')
  await expect(domain(page)).toHaveText('High-volume payment risk management')

  await page.goto('/')
  await page.getByRole('button', { name: 'Open example' }).click()
  await answerDialog(page, 'Open example')
  await expect(titleText(page)).toHaveText('Supermegaretail Demand Forecasting')
})

test('m2-home-03 / m2-designs-03: Your designs rows, last edited first, open and delete', async ({ page }) => {
  const db = await signedInClient()
  const empty = await createCloudDesign('Ride ETA Prediction')
  await signInHome(page)
  await page.getByRole('button', { name: 'Start task' }).click()
  await expect(titleText(page)).toHaveText('SuperPay Real-Time Fraud Detection')
  const taskId = page.url().split('/d/')[1]
  await setCardValue(page, 'problem-space', 'ML Task', 'Binary classification, real-time scoring')
  await waitSaved(page)
  // Two open findings and one resolved on the task.
  const run = crypto.randomUUID()
  await serviceInsert('review_runs', [{ id: run, design_id: taskId, user_id: TEST_A, scope: 'design', model: 'm', status: 'succeeded', design_version: 1, design_snapshot: {} }])
  const f = (title: string, status = 'open') => ({ run_id: run, design_id: taskId, user_id: TEST_A, position: 0, severity: 'major', dimension: 'd', anchor_kind: 'design', anchor_label: 'Design', title, evidence: 'e', why: 'w', fix: 'f', status })
  await serviceInsert('findings', [f('one'), f('two'), f('three', 'resolved')])

  await page.goto('/')
  await expect(rows(page)).toHaveCount(2)
  const top = rows(page).first()
  await expect(top).toContainText('SuperPay Real-Time Fraud Detection')
  await expect(top.getByText('Task', { exact: true })).toBeVisible()
  await expect(top).toContainText('Binary classification, real-time scoring')
  await expect(top).toContainText('1 / 9 sections')
  await expect(top).toContainText('2 open findings')
  await expect(top).toContainText('Just now')
  await expect(top.locator('[data-filled="true"]')).toHaveCount(1)
  const second = rows(page).nth(1)
  await expect(second).toContainText('Ride ETA Prediction')
  await expect(second).toContainText('ML Task not chosen')
  await expect(second).toContainText('0 / 9 sections')
  await expect(second).not.toContainText('trade-offs')
  await expect(second).not.toContainText('open finding')

  // Open from the list.
  await second.getByRole('button', { name: 'Open Ride ETA Prediction' }).click()
  await expect(page).toHaveURL(new RegExp(`/d/${empty}$`))
  await expect(titleText(page)).toHaveText('Ride ETA Prediction')

  // Delete asks with the M1 dialog; Cancel keeps it, Delete removes it for good.
  await page.goto('/')
  await rows(page).first().getByRole('button', { name: 'More actions' }).click()
  await expect(page.getByRole('menu', { name: 'More actions' }).getByRole('menuitem')).toHaveText(['Delete'])
  await page.getByRole('menuitem', { name: 'Delete' }).click()
  expect(await answerDialog(page, 'Cancel')).toContain('SuperPay Real-Time Fraud Detection')
  await expect(rows(page)).toHaveCount(2)
  await rows(page).first().getByRole('button', { name: 'More actions' }).click()
  await page.getByRole('menuitem', { name: 'Delete' }).click()
  await answerDialog(page, 'Delete')
  await expect(rows(page)).toHaveCount(1)
  await page.reload()
  await expect(rows(page)).toHaveCount(1)
  await expect(rows(page).first()).toContainText('Ride ETA Prediction')
  expect((await db.from('findings').select('id')).data).toEqual([])
  // No folders, search or rename from the list.
  await expect(section(page, 'Your designs').getByRole('searchbox')).toHaveCount(0)
  await expect(section(page, 'Your designs').getByRole('textbox')).toHaveCount(0)
})

test('m2-home-03: empty state when there are no designs', async ({ page }) => {
  await signInHome(page)
  await expect(section(page, 'Your designs')).toContainText('No designs yet')
  await expect(rows(page)).toHaveCount(0)
})

test('m2-designs-03: New design and Start task create a cloud design at once', async ({ page }) => {
  const db = await signedInClient()
  await signInHome(page)
  await page.getByRole('button', { name: 'New design' }).click()
  await expect(page).toHaveURL(/\/d\/[0-9a-f-]{36}$/)
  await page.goto('/')
  await page.getByRole('button', { name: 'Start task' }).click()
  await expect(page).toHaveURL(/\/d\/[0-9a-f-]{36}$/)
  const created = (await db.from('designs').select('origin, source_id').order('created_at')).data
  expect(created).toEqual([
    { origin: 'blank', source_id: null },
    { origin: 'task', source_id: 'superpay-fraud-detection' },
  ])
})

test('m2-home-04: guest Your designs is inactive; Current work with Continue; replacing asks first', async ({ page }) => {
  await page.goto('/')
  const yours = section(page, 'Your designs')
  await expect(yours).toContainText('Sign in to keep several designs and run AI review')
  await expect(yours.getByRole('button', { name: 'Sign in with Google' })).toBeVisible()
  await expect(page.getByTestId('current-work')).toHaveCount(0)

  await page.getByRole('button', { name: 'New design' }).click()
  await setTitle(page, 'Mine')
  await waitSaved(page)
  await page.getByRole('link', { name: 'ML System Design Trainer: home' }).click()
  const current = page.getByTestId('current-work')
  await expect(current).toContainText('Current work · in this browser')
  await expect(current).toContainText('Mine')
  await current.getByRole('button', { name: 'Continue' }).click()
  await expect(titleText(page)).toHaveText('Mine')

  await page.goto('/')
  await page.getByRole('button', { name: 'Start task' }).click()
  const dialog = page.getByRole('alertdialog')
  await expect(dialog.getByRole('heading', { name: 'Replace your current work?' })).toBeVisible()
  await answerDialog(page, 'Cancel')
  await expect(page).toHaveURL('http://localhost:4173/')
  await expect(page.getByTestId('current-work')).toContainText('Mine')
})

test('m2-home-05: a signed-in example is copied on first edit; the library example stays unchanged', async ({ page }) => {
  const db = await signedInClient()
  await signInHome(page)
  await page.getByRole('button', { name: 'Open example' }).click()
  await expect(page).toHaveURL(/\/library\/retail-demand-forecasting$/)
  await expect(titleText(page)).toHaveText('Supermegaretail Demand Forecasting')
  await page.getByRole('link', { name: 'ML System Design Trainer: home' }).click()
  await expect(section(page, 'Your designs')).toContainText('No designs yet')
  expect((await db.from('designs').select('id')).data).toEqual([])

  await page.getByRole('button', { name: 'Open example' }).click()
  await setCardValue(page, 'problem-space', 'Domain', 'Grocery')
  await expect(page).toHaveURL(/\/d\/[0-9a-f-]{36}$/)
  await waitSaved(page)
  // The editor stays as it was: no reload after the copy is made.
  await expect(domain(page)).toHaveText('Grocery')
  await setCardValue(page, 'problem-space', 'Business Goal', 'Less waste')
  await waitSaved(page)
  const saved = (await db.from('designs').select('origin, source_id, data').single()).data!
  expect(saved).toMatchObject({ origin: 'example', source_id: 'retail-demand-forecasting' })
  expect(saved.data.sections[0].keyProperties.slice(0, 2).map((p: { value: string }) => p.value)).toEqual(['Grocery', 'Less waste'])

  await page.getByRole('link', { name: 'ML System Design Trainer: home' }).click()
  await expect(rows(page)).toHaveCount(1)
  await expect(rows(page).first().getByText('Example', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Open example' }).click()
  await expect(domain(page)).toHaveText('Retail, grocery chain')
})

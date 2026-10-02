import { answerDialog, setCardValue, setTitle, waitSaved } from '../../helpers'
import { createCloudDesign, expect, signedInClient, signInAsTestUser, test } from '../../m2/fixtures'
import { home, region, rows, titleOf, value } from './setup'

test('AT-26 sign-in moves the guest design', async ({ page }) => {
  const cloudA = await createCloudDesign('Cloud A')
  const db = await signedInClient()
  const before = (await db.from('designs').select('data, version, title').eq('id', cloudA).single()).data
  await page.goto('/')
  await page.getByRole('button', { name: 'New design' }).click()
  await setTitle(page, 'Mine')
  await setCardValue(page, 'problem-space', 'Domain', 'Payments')
  await waitSaved(page)
  await signInAsTestUser(page)
  // 1. Your designs has Cloud A and Mine; Cloud A unchanged; no Current work.
  await page.goto('/')
  await expect(rows(page)).toHaveCount(2)
  await expect(rows(page).filter({ hasText: 'Cloud A' })).toHaveCount(1)
  await expect(rows(page).filter({ hasText: 'Mine' })).toHaveCount(1)
  expect((await db.from('designs').select('data, version, title').eq('id', cloudA).single()).data).toEqual(before)
  await expect(page.getByTestId('current-work')).toHaveCount(0)
  // 2. Mine has Domain = Payments.
  await rows(page).filter({ hasText: 'Mine' }).getByRole('button', { name: 'Open Mine' }).click()
  await expect(value(page, 'problem-space', 'Domain')).toHaveText('Payments')
  // 3. After a reload both designs are there.
  await home(page)
  await page.reload()
  await expect(rows(page)).toHaveCount(2)
  // 4. Sign out → the guest home without Current work.
  await page.getByRole('button', { name: 'Account menu' }).click()
  await page.getByRole('menuitem', { name: 'Sign out' }).click()
  await expect(region(page, 'Your designs')).toContainText('Sign in to keep several designs')
  await expect(page.getByTestId('current-work')).toHaveCount(0)
})

test('AT-27 several designs', async ({ page }) => {
  await page.goto('/')
  await signInAsTestUser(page)
  // 1. A, then B with one Key Property value → B first, then A; 1 / 9 and 0 / 9 sections.
  await page.getByRole('button', { name: 'New design' }).click()
  await setTitle(page, 'A')
  await waitSaved(page)
  await home(page)
  await page.getByRole('button', { name: 'New design' }).click()
  await setTitle(page, 'B')
  await setCardValue(page, 'baseline', 'Approach', 'Seasonal naive')
  await waitSaved(page)
  await home(page)
  await expect(rows(page)).toHaveCount(2)
  await expect(rows(page).nth(0).getByRole('button', { name: 'Open B', exact: true })).toBeVisible()
  await expect(rows(page).nth(0)).toContainText('1 / 9 sections')
  await expect(rows(page).nth(1).getByRole('button', { name: 'Open A', exact: true })).toBeVisible()
  await expect(rows(page).nth(1)).toContainText('0 / 9 sections')
  // 2. A changed → A first.
  await rows(page).nth(1).getByRole('button', { name: 'Open A' }).click()
  await setCardValue(page, 'problem-space', 'Domain', 'Payments')
  await waitSaved(page)
  await home(page)
  await expect(rows(page).nth(0).getByRole('button', { name: 'Open A', exact: true })).toBeVisible()
  // 3. ⋯ at B → Delete, confirm → B is gone, also after reload.
  await rows(page).filter({ has: page.getByRole('button', { name: 'Open B', exact: true }) }).getByRole('button', { name: 'More actions' }).click()
  await page.getByRole('menuitem', { name: 'Delete' }).click()
  await answerDialog(page, 'Delete')
  await expect(rows(page)).toHaveCount(1)
  await page.reload()
  await expect(rows(page)).toHaveCount(1)
  await expect(rows(page).first().getByRole('button', { name: 'Open A', exact: true })).toBeVisible()
})

test('AT-28 a signed-in example is saved as a copy', async ({ page }) => {
  await page.goto('/')
  await signInAsTestUser(page)
  // 1. Open example, change nothing, back → Your designs is empty.
  await page.getByRole('button', { name: 'Open example' }).click()
  await expect(titleOf(page)).toHaveText('Supermegaretail Demand Forecasting')
  await home(page)
  await expect(rows(page)).toHaveCount(0)
  // 2. Open example, Domain = Grocery, back → the example with the Example chip.
  await page.getByRole('button', { name: 'Open example' }).click()
  await setCardValue(page, 'problem-space', 'Domain', 'Grocery')
  await waitSaved(page)
  await home(page)
  await expect(rows(page)).toHaveCount(1)
  await expect(rows(page).first()).toContainText('Supermegaretail Demand Forecasting')
  await expect(rows(page).first().getByText('Example', { exact: true })).toBeVisible()
  // 3. Open example from Examples again → Domain is the original.
  await page.getByRole('button', { name: 'Open example' }).click()
  await expect(value(page, 'problem-space', 'Domain')).toHaveText('Retail, grocery chain')
})

test('AT-29 edits in two tabs', async ({ page, context }) => {
  const id = await createCloudDesign('A')
  await page.goto('/')
  await signInAsTestUser(page)
  await page.goto(`/d/${id}`)
  const tab2 = await context.newPage()
  await tab2.goto(`/d/${id}`)
  await expect(titleOf(tab2)).toHaveText('A')
  await setCardValue(page, 'problem-space', 'Domain', 'One')
  await waitSaved(page)
  await setCardValue(tab2, 'problem-space', 'Domain', 'Two')
  const banner = tab2.getByRole('alert')
  await expect(banner).toContainText('changed in another tab or device')
  await expect(banner.getByRole('button', { name: 'Reload' })).toBeVisible()
  const db = await signedInClient()
  const domain = async () => (await db.from('designs').select('data').eq('id', id).single()).data!.data.sections[0].keyProperties.find((p: { key: string }) => p.key === 'Domain').value
  expect(await domain()).toBe('One')
  await banner.getByRole('button', { name: 'Reload' }).click()
  await expect(value(tab2, 'problem-space', 'Domain')).toHaveText('One')
})

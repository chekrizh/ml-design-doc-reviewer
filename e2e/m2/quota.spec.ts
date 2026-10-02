import { setCardValue } from '../helpers'
import { createCloudDesign, expect, openCloud, serviceInsert, signInAsTestUser, TEST_A, test } from './fixtures'

// D36: database quotas reach the user as a plain message, not a generic failure.
test('m2-quota-01: the 51st design is refused with the design limit message', async ({ page }) => {
  await serviceInsert(
    'designs',
    Array.from({ length: 50 }, (_, i) => ({ user_id: TEST_A, origin: 'blank', title: `D${i}`, data: {}, summary: { filledSections: [], tradeoffs: 0, mlTask: null } })),
  )
  await page.goto('/')
  await signInAsTestUser(page)
  await page.getByRole('button', { name: 'New design' }).click()
  await expect(page.getByRole('alertdialog')).toContainText('You have 50 designs, the most an account can keep.')
})

test('m2-quota-02: autosave of a design over 2 MB shows the size message and Not saved', async ({ page }) => {
  await openCloud(page, await createCloudDesign('Big'))
  await setCardValue(page, 'problem-space', 'Domain', 'x'.repeat(2_000_001))
  await expect(page.getByTestId('toast')).toContainText('This design is over 2 MB')
  await expect(page.getByTestId('header-save-state')).toHaveText('Not saved')
})

import { expect, createCloudDesign, openCloud, openExampleWithKey, reviewPanel, runReview, test } from './fixtures'

const ai = (page: import('@playwright/test').Page) => page.getByRole('menu', { name: 'AI Review' })

test('m2-header-01: a guest sees the default avatar and Sign in with Google left of AI Review and Share; AI Review asks to sign in', async ({ page }) => {
  await page.goto('/local')
  const header = page.locator('header').first()
  const avatar = header.getByRole('img', { name: 'Guest' })
  await expect(avatar).toHaveAttribute('src', '/default-avatar.png')
  const sign = (await header.getByRole('button', { name: 'Sign in with Google' }).boundingBox())!
  const aiBox = (await header.getByRole('button', { name: 'AI Review', exact: true }).boundingBox())!
  const share = (await header.getByRole('button', { name: 'Share', exact: true }).boundingBox())!
  expect((await avatar.boundingBox())!.x).toBeLessThan(aiBox.x)
  expect(sign.x).toBeLessThan(aiBox.x)
  expect(aiBox.x).toBeLessThan(share.x)
  await header.getByRole('button', { name: 'AI Review', exact: true }).click()
  await expect(ai(page)).toContainText('Sign in to run AI review')
  await expect(ai(page).getByRole('menuitem', { name: 'Review whole design' })).toHaveCount(0)
})

test('m2-header-01: signed in: Google photo left of the buttons; account menu; Share order; AI Review without and with a key', async ({ page }) => {
  await openCloud(page, await createCloudDesign('A'))
  const header = page.locator('header').first()
  const photo = (await header.getByRole('img', { name: 'Google profile photo' }).boundingBox())!
  expect(photo.x).toBeLessThan((await header.getByRole('button', { name: 'AI Review', exact: true }).boundingBox())!.x)
  await header.getByRole('button', { name: 'Account menu' }).click()
  await expect(page.getByRole('menu', { name: 'Account menu' }).getByRole('menuitem')).toHaveText(['My designs', 'AI Review settings', 'Sign out'])
  await page.keyboard.press('Escape')
  await header.getByRole('button', { name: 'Share', exact: true }).click()
  await expect(page.getByRole('menu', { name: 'Share' }).getByRole('menuitem')).toHaveText(['Export to Google DocsCreates a new Google Doc in your Drive', 'Export PDF', 'Export Markdown'])
  await page.keyboard.press('Escape')
  await header.getByRole('button', { name: 'AI Review', exact: true }).click()
  await expect(ai(page)).toContainText('Add your OpenRouter key')
  await expect(ai(page).getByRole('menuitem', { name: 'Add key' })).toBeVisible()
  await expect(ai(page)).not.toContainText('Coming soon')
})

test('m2-header-01: with a key the AI Review menu has the whole design, the 9 sections, the model, the last run time and Settings', async ({ page }) => {
  await openExampleWithKey(page)
  await page.getByRole('button', { name: 'AI Review', exact: true }).click()
  await expect(ai(page).getByRole('menuitem', { name: 'Review whole design' })).toBeVisible()
  await expect(ai(page).getByRole('group', { name: 'Review one section' }).getByRole('menuitem')).toHaveText([
    'Problem Space', 'Evaluation (Offline)', 'Baseline', 'Validation', 'Data & Features', 'Evaluation (Online)', 'Integration', 'Monitoring', 'Target Solution & Architecture',
  ])
  await expect(ai(page)).toContainText('Google: Gemini 2.5 Flash')
  await expect(ai(page).getByRole('menuitem', { name: 'Settings' })).toBeVisible()
  await page.keyboard.press('Escape')
  await runReview(page)
  await expect(reviewPanel(page).getByTestId('severity-counts')).toContainText('1 critical')
  await page.getByRole('button', { name: 'AI Review', exact: true }).click()
  await expect(ai(page)).toContainText(/last run (just now|\d+ minutes? ago)/)
})

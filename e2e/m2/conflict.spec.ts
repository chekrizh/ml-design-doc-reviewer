import { card, setCardValue, waitSaved } from '../helpers'
import { createCloudDesign, expect, openCloud, signedInClient, test } from './fixtures'

test('m2-designs-02: a save over a newer version shows the banner, stops autosave, and reload shows the stored version', async ({ page, context }) => {
  const id = await createCloudDesign('A')
  await openCloud(page, id)
  const tab2 = await context.newPage()
  await tab2.goto(`/d/${id}`)
  await expect(tab2.getByRole('button', { name: 'Edit Design title' })).toHaveText('A')

  await setCardValue(page, 'problem-space', 'Domain', 'One')
  await waitSaved(page)
  await setCardValue(tab2, 'problem-space', 'Domain', 'Two')

  const banner = tab2.getByRole('alert')
  await expect(banner).toContainText('This design was changed in another tab or device')
  await expect(tab2.getByTestId('header-save-state')).toHaveText('Not saved')
  const db = await signedInClient()
  const domain = async () =>
    (await db.from('designs').select('data').eq('id', id).single()).data!.data.sections[0].keyProperties.find((p: { key: string }) => p.key === 'Domain').value
  expect(await domain()).toBe('One')

  // Autosave has stopped: a later edit in tab 2 is not written either.
  const patches: string[] = []
  tab2.on('request', (r) => r.method() === 'PATCH' && patches.push(r.url()))
  await setCardValue(tab2, 'problem-space', 'Business Goal', 'Later')
  await expect(tab2.getByTestId('header-save-state')).toHaveText('Not saved')
  await page.waitForLoadState('networkidle')
  expect(patches).toEqual([])
  expect(await domain()).toBe('One')

  await banner.getByRole('button', { name: 'Reload' }).click()
  await expect(card(tab2, 'problem-space').getByRole('button', { name: 'Edit Domain' })).toHaveText('One')
  await expect(tab2.getByRole('alert')).toHaveCount(0)
  // Autosave works again after reload.
  await setCardValue(tab2, 'problem-space', 'Domain', 'Three')
  await waitSaved(tab2)
  expect(await domain()).toBe('Three')
})

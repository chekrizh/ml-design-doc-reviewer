import { card, cardBox, loadExample, reload, resizeCard, setCardValue, setTitle, toMode, waitSaved, docSection } from '../helpers'
import { createCloudDesign, expect, openCloud, signedInClient, signInAsTestUser, test } from './fixtures'

test('m2-designs-01 / m2-setup-04: edits autosave to Supabase and reload restores everything', async ({ page }) => {
  const id = await createCloudDesign('Cloud A')
  await openCloud(page, id)
  await expect(page.getByRole('button', { name: 'Edit Design title' })).toHaveText('Cloud A')

  await loadExample(page)
  await setTitle(page, 'Renamed')
  await setCardValue(page, 'baseline', 'Approach', 'Seasonal naive')
  await resizeCard(page, 'problem-space', -120, 0)
  await waitSaved(page)
  const before = await cardBox(page, 'problem-space')

  const db = await signedInClient()
  const row = async () => (await db.from('designs').select('title, data, version').eq('id', id).single()).data!
  const saved = await row()
  expect(saved.title).toBe('Renamed')
  expect(saved.version).toBeGreaterThan(1)

  await reload(page)
  await expect(page).toHaveURL(new RegExp(`/d/${id}$`))
  await expect(page.getByRole('button', { name: 'Edit Design title' })).toHaveText('Renamed')
  await expect(card(page, 'baseline').getByRole('button', { name: 'Edit Approach' })).toHaveText('Seasonal naive')
  await expect(page.locator('[data-indicator="Trade-offs"][data-state="on"]')).toHaveCount(saved.data.sections.filter((s: { tradeoffs: { chosenId: string | null } }) => s.tradeoffs.chosenId).length)
  await expect(page.getByTestId('thumbnail').locator('img')).toHaveCount(2)
  expect((await cardBox(page, 'problem-space')).w).toBe(before.w)
  await toMode(page, 'Document')
  await expect(docSection(page, 'integration').getByRole('textbox', { name: 'Integration rationale' })).not.toBeEmpty()
  // Opening a design does not write it.
  expect(await row()).toEqual(saved)
})

test('m2-designs-01: the header save status works as in M1, including an error', async ({ page }) => {
  const id = await createCloudDesign('Cloud A')
  await openCloud(page, id)
  const status = page.getByTestId('header-save-state')
  await expect(status).toHaveText('Saved')
  await page.route('http://127.0.0.1:54321/rest/v1/designs*', (r) => (r.request().method() === 'PATCH' ? r.fulfill({ status: 500, json: { message: 'down' } }) : r.fallback()))
  await setCardValue(page, 'problem-space', 'Domain', 'Payments')
  await expect(status).toHaveText('Saving…')
  await expect(status).toHaveText('Not saved')
  await page.unrouteAll()
  await setCardValue(page, 'problem-space', 'Domain', 'Payments 2')
  await waitSaved(page)
})

test('m2-setup-04: a cloud URL needs a signed-in owner; others go home', async ({ page }) => {
  const id = await createCloudDesign('Cloud B', { email: 'test-b@example.test' })
  await page.goto(`/d/${id}`)
  await expect(page).toHaveURL('http://localhost:4173/')
  await signInAsTestUser(page)
  // Signed in as A: B's design is not visible under RLS.
  await page.goto(`/d/${id}`)
  await expect(page).toHaveURL('http://localhost:4173/')
})

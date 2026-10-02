import { dialog, openDetails } from '../helpers'
import { mockOpenRouter } from '../mocks/openrouter/server'
import { expect, openExampleWithKey, reviewPanel, runReview, test } from './fixtures'

test('m2-review-09: the Component Editor has a Findings column for its section, markers on the fields and the review indicator', async ({ page }) => {
  await openExampleWithKey(page)
  await runReview(page)
  await expect(reviewPanel(page).getByTestId('severity-counts')).toContainText('1 critical')
  await openDetails(page, 'evaluation-online')
  const d = dialog(page)
  await expect(d.locator('[data-indicator="Review"]')).toHaveAttribute('data-state', 'red')
  const col = d.getByRole('complementary', { name: 'Findings' })
  await expect(col.getByTestId('finding')).toHaveCount(3)
  await expect(col.getByRole('tab', { name: 'Open 3' })).toHaveAttribute('aria-selected', 'true')
  await expect(col.getByRole('button', { name: 'Review this section' })).toBeVisible()

  // Markers: Key Metric (right of its value), the matrix row, the Rationale heading; no other key property.
  const markers = d.getByTestId('field-marker')
  await expect(markers).toHaveCount(3)
  const km = d.locator('[data-field="evaluation-online:kp:evaluation-online-p1"]')
  await expect(km.getByTestId('field-marker')).toHaveCount(1)
  const valueBox = (await km.getByRole('textbox', { name: 'Property 2 value' }).boundingBox())!
  const markerBox = (await km.getByTestId('field-marker').boundingBox())!
  expect(markerBox.x).toBeGreaterThan(valueBox.x + valueBox.width - 1)
  for (const other of ['p0', 'p2', 'p3']) await expect(d.locator(`[data-field="evaluation-online:kp:evaluation-online-${other}"]`).getByTestId('field-marker')).toHaveCount(0)
  const row = d.locator('[data-field="evaluation-online:opt:o1"]')
  await expect(row.getByTestId('field-marker')).toHaveCount(1)
  await expect(d.getByRole('region', { name: 'Rationale & Notes' }).getByTestId('field-marker').first()).toBeVisible()

  // Marker click expands its finding; finding click highlights and scrolls to the field.
  await row.getByTestId('field-marker').click()
  const split = col.getByTestId('finding').filter({ hasText: 'Split by distribution center leaves too few units' })
  await expect(split.getByRole('button', { expanded: true })).toBeVisible()
  const avg = col.getByTestId('finding').filter({ hasText: 'Average check does not measure' })
  await avg.getByRole('button', { expanded: false }).click()
  await expect(km).toHaveClass(/outline-indigo-300/)
  await expect(km).toBeInViewport()
})

test('m2-review-06/09: Review this section in the editor runs a section review', async ({ page }) => {
  await openExampleWithKey(page)
  await runReview(page)
  await expect(reviewPanel(page).getByTestId('severity-counts')).toContainText('1 critical')
  await mockOpenRouter.scenario('R2', 800)
  await openDetails(page, 'evaluation-online')
  const col = dialog(page).getByRole('complementary', { name: 'Findings' })
  await col.getByRole('button', { name: 'Review this section' }).click()
  await expect(col.getByRole('button', { name: 'Reviewing…' })).toBeDisabled()
  await expect(col.getByTestId('finding')).toHaveCount(1)
  await expect(col).toContainText('Primary metric is a revenue proxy')
  const sent = await mockOpenRouter.lastRequest()
  expect(sent.body.messages[0].content[0].text).toContain('[section:evaluation-online]')
})

test('m2-review-09: a guest editor has no Findings column', async ({ page }) => {
  await page.goto('/local')
  await openDetails(page, 'evaluation-online')
  await expect(dialog(page).getByRole('complementary', { name: 'Findings' })).toHaveCount(0)
})

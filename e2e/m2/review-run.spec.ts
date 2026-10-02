import type { Page } from '@playwright/test'
import { card } from '../helpers'
import { mockOpenRouter } from '../mocks/openrouter/server'
import { expect, openExampleWithKey, reviewPanel, runReview, test } from './fixtures'

const indicator = (page: Page, sid: Parameters<typeof card>[1]) => card(page, sid).locator('[data-indicator="Review"]')
const badge = (page: Page, sid: Parameters<typeof card>[1]) => card(page, sid).getByTestId('findings-badge')
const counts = (page: Page) => reviewPanel(page).getByTestId('severity-counts')

async function fullReview(page: Page) {
  await runReview(page)
  await expect(reviewPanel(page).getByRole('status')).toBeHidden()
  await expect(counts(page)).toContainText('1 critical')
}

test('m2-review-06/07/08: a whole-design review: running state, then signals on cards and grouped findings in the panel', async ({ page }) => {
  await openExampleWithKey(page)
  await mockOpenRouter.scenario('R1', 1500)
  await expect(indicator(page, 'baseline')).toHaveAttribute('data-state', 'none')
  await runReview(page)
  const status = reviewPanel(page).getByRole('status')
  await expect(status).toContainText('Reviewing whole design…')
  await expect(status.getByRole('button', { name: 'Cancel' })).toBeVisible()
  await expect(indicator(page, 'baseline')).toHaveAttribute('data-running', 'true')
  // Editing during the run is allowed.
  await expect(status).toBeHidden()

  await expect(counts(page).locator('[data-count="critical"]')).toContainText('1')
  await expect(counts(page).locator('[data-count="major"]')).toContainText('2')
  await expect(counts(page).locator('[data-count="minor"]')).toContainText('2')
  await expect(indicator(page, 'evaluation-online')).toHaveAttribute('data-state', 'red')
  await expect(indicator(page, 'evaluation-online').locator('[data-alert]')).toHaveCount(1)
  await expect(badge(page, 'evaluation-online')).toHaveText('3 findings')
  await expect(badge(page, 'evaluation-online').locator('[data-severity]')).toHaveAttribute('data-severity', 'critical')
  await expect(indicator(page, 'problem-space')).toHaveAttribute('data-state', 'green')
  await expect(badge(page, 'problem-space')).toHaveText('1 finding')
  await expect(indicator(page, 'baseline')).toHaveAttribute('data-state', 'green')
  await expect(badge(page, 'baseline')).toHaveCount(0)

  const groups = reviewPanel(page).getByTestId('review-findings').locator('section')
  await expect(groups.first()).toHaveAttribute('aria-label', 'Whole design')
  await expect(groups.first()).toContainText('Out-of-stock is called costlier')
  const eo = reviewPanel(page).getByRole('region', { name: 'Evaluation (Online)' })
  await expect(eo.getByTestId('finding')).toHaveCount(2)
  await expect(eo.getByRole('button', { name: '1 minor — show' })).toBeVisible()
  // The request carried 3 PNG diagrams.
  const sent = await mockOpenRouter.lastRequest()
  const images = sent.body.messages[1].content.filter((p: { type: string }) => p.type === 'image_url')
  expect(images).toHaveLength(3)
  for (const im of images) expect(im.image_url.url).toMatch(/^data:image\/png;base64,iVBORw0KGgo/)
})

test('m2-review-08: expanding a finding shows evidence and why, the fix behind Show fix, and focuses its card; the badge opens the panel at its section', async ({ page }) => {
  await openExampleWithKey(page)
  await fullReview(page)
  const f = reviewPanel(page).getByTestId('finding').filter({ hasText: 'Average check does not measure the stated goal' })
  await f.getByRole('button', { expanded: false }).click()
  await expect(f).toContainText('What the design says')
  await expect(f).toContainText('Why it matters')
  await expect(f).not.toContainText('Make the primary metric waste plus lost sales')
  await f.getByRole('button', { name: 'Show fix' }).click()
  await expect(f).toContainText('Make the primary metric waste plus lost sales')
  await expect(card(page, 'evaluation-online')).toHaveAttribute('data-highlight', 'true')
  await expect(card(page, 'evaluation-online')).toBeInViewport()

  await reviewPanel(page).getByRole('button', { name: 'Close review' }).click()
  await expect(reviewPanel(page)).toBeHidden()
  await badge(page, 'problem-space').click()
  const antigoals = reviewPanel(page).getByTestId('finding').filter({ hasText: 'Antigoals are not stated' })
  await expect(antigoals.getByRole('button', { name: /Antigoals/ })).toHaveAttribute('aria-expanded', 'true')
})

test('m2-review-06: a section review replaces only that section', async ({ page }) => {
  await openExampleWithKey(page)
  await fullReview(page)
  await mockOpenRouter.scenario('R2')
  await runReview(page, 'Evaluation (Online)')
  await expect(counts(page).locator('[data-count="critical"]')).toContainText('0')
  await expect(badge(page, 'evaluation-online')).toHaveText('1 finding')
  const panel = reviewPanel(page)
  await expect(panel).toContainText('Primary metric is a revenue proxy')
  await expect(panel).not.toContainText('Average check does not measure')
  await expect(panel).toContainText('Out-of-stock is called costlier')
  await expect(badge(page, 'problem-space')).toHaveText('1 finding')
})

test('m2-review-06: errors and Cancel keep the previous findings and show the error with its action', async ({ page }) => {
  await openExampleWithKey(page)
  await fullReview(page)
  const cases: [Parameters<typeof mockOpenRouter.scenario>[0], RegExp, string][] = [
    ['401', /OpenRouter rejected your key/, 'Replace key'],
    ['402', /out of credits/, 'Run again'],
    ['429', /limiting requests/, 'Run again'],
    ['bad_output', /could not be read/, 'Run again'],
    ['no_images', /cannot read diagrams/, 'Choose model'],
  ]
  for (const [scenario, text, action] of cases) {
    await mockOpenRouter.scenario(scenario)
    await runReview(page)
    const alert = reviewPanel(page).getByRole('alert')
    await expect(alert).toContainText(text)
    await expect(alert.getByRole('button', { name: action })).toBeVisible()
    await expect(counts(page)).toContainText('1 critical')
    await expect(counts(page)).toContainText('2 major')
    await expect(counts(page)).toContainText('2 minor')
    await expect(badge(page, 'evaluation-online')).toHaveText('3 findings')
  }
  await mockOpenRouter.scenario('R2', 5000)
  await runReview(page)
  await reviewPanel(page).getByRole('status').getByRole('button', { name: 'Cancel' }).click()
  await expect(reviewPanel(page).getByRole('status')).toBeHidden()
  await expect(reviewPanel(page).getByRole('alert')).toHaveCount(0)
  await expect(counts(page)).toContainText('1 critical')
  await expect(badge(page, 'evaluation-online')).toHaveText('3 findings')
})

test('m2-review-08: a stale finding is faded with "Field changed since review"; a removed field moves to Whole design', async ({ page }) => {
  await openExampleWithKey(page)
  await fullReview(page)
  const { setCardValue } = await import('../helpers')
  await setCardValue(page, 'evaluation-online', 'Key Metric', 'Waste plus lost sales')
  const f = reviewPanel(page).getByTestId('finding').filter({ hasText: 'Average check does not measure' })
  await expect(f).toContainText('Field changed since review')
  await expect(f).toHaveClass(/opacity-70/)
  // Back to the reviewed text: no longer stale.
  await setCardValue(page, 'evaluation-online', 'Key Metric', 'Average check, proxy for revenue')
  await expect(f).not.toContainText('Field changed since review')
})

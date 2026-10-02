import type { Page } from '@playwright/test'
import { card, closeEditor, dialog, openDetails, toMode } from '../helpers'
import { expect, openExampleWithKey, reviewPanel, runReview, test } from './fixtures'

const badge = (page: Page) => card(page, 'evaluation-online').getByTestId('findings-badge')
const ind = (page: Page) => card(page, 'evaluation-online').locator('[data-indicator="Review"]')
const finding = (scope: ReturnType<Page['locator']>, title: string) => scope.getByTestId(/^(finding|comment)$/).filter({ hasText: title })

async function expand(f: ReturnType<Page['locator']>) {
  const b = f.locator('button[aria-expanded="false"]')
  if (await b.count()) await b.click()
}

test('m2-review-11: Resolve, Dismiss and Reopen in the panel, the editor and the document update everything without reload; statuses survive reload', async ({ page }) => {
  await openExampleWithKey(page)
  await runReview(page)
  const panel = reviewPanel(page)
  await expect(panel.getByTestId('severity-counts')).toContainText('1 critical')

  // 1. Resolve the critical in the panel.
  const crit = finding(panel, 'Average check does not measure')
  await expand(crit)
  await crit.getByRole('button', { name: 'Resolve' }).click()
  await expect(badge(page)).toHaveText('2 findings')
  await expect(ind(page)).toHaveAttribute('data-state', 'red')

  // 2. The editor: Open has 2, Resolved has the critical; no marker on Key Metric.
  await openDetails(page, 'evaluation-online')
  const col = dialog(page).getByRole('complementary', { name: 'Findings' })
  await expect(col.getByRole('tab', { name: 'Open 2' })).toBeVisible()
  await expect(col.getByTestId('finding')).toHaveCount(2)
  await expect(dialog(page).locator('[data-field="evaluation-online:kp:evaluation-online-p1"]').getByTestId('field-marker')).toHaveCount(0)
  await col.getByRole('tab', { name: 'Resolved 1' }).click()
  await expect(col.getByTestId('finding')).toContainText(['Average check does not measure the stated goal'])
  await col.getByRole('tab', { name: 'Open 2' }).click()

  // 3. Dismiss the major in the editor → badge 1, green; Dismissed tab of the panel has it.
  const split = finding(col, 'Split by distribution center leaves')
  await expand(split)
  await split.getByRole('button', { name: 'Dismiss' }).click()
  await closeEditor(page)
  await expect(badge(page)).toHaveText('1 finding')
  await expect(ind(page)).toHaveAttribute('data-state', 'green')
  await panel.getByRole('tab', { name: 'Dismissed 1' }).click()
  await expect(panel.getByTestId('finding')).toContainText(['Split by distribution center leaves too few units to detect +0.3%'])
  await panel.getByRole('tab', { name: /^Open/ }).click()

  // 4. The document: neither in Open; the critical in Resolved; Reopen → canvas badge 2, red.
  await toMode(page, 'Document')
  const comments = page.getByRole('complementary', { name: 'Comments' })
  await expect(comments).not.toContainText('Average check does not measure')
  await expect(comments).not.toContainText('Split by distribution center leaves')
  await comments.getByRole('tab', { name: 'Resolved 1' }).click()
  await finding(comments, 'Average check does not measure').getByRole('button', { name: 'Reopen' }).click()
  await toMode(page, 'Canvas')
  await expect(badge(page)).toHaveText('2 findings')
  await expect(ind(page)).toHaveAttribute('data-state', 'red')

  // Statuses survive reload (once their saves have answered).
  await page.waitForLoadState('networkidle')
  await page.reload()
  await expect(badge(page)).toHaveText('2 findings')
  await badge(page).click()
  await expect(reviewPanel(page).getByTestId('severity-counts')).toContainText('1 critical')
  await expect(reviewPanel(page).getByRole('tab', { name: 'Dismissed 1' })).toBeVisible()
})

test('m2-review-11: a status that cannot be saved rolls back with a notice', async ({ page }) => {
  await openExampleWithKey(page)
  await runReview(page)
  await expect(reviewPanel(page).getByTestId('severity-counts')).toContainText('1 critical')
  await page.route('http://127.0.0.1:54321/rest/v1/findings*', (r) => (r.request().method() === 'PATCH' ? r.fulfill({ status: 500, json: {} }) : r.fallback()))
  const crit = finding(reviewPanel(page), 'Average check does not measure')
  await expand(crit)
  await crit.getByRole('button', { name: 'Resolve' }).click()
  await expect(page.getByTestId('toast')).toContainText('could not be saved')
  await expect(badge(page)).toHaveText('3 findings')
})

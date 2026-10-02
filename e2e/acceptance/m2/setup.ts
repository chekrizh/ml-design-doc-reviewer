// Shared steps of the M2 scenarios (docs/acceptance-tests.md, 'Тестовое окружение M2').
import type { Page } from '@playwright/test'
import { card } from '../../helpers'
import { mockOpenRouter } from '../../mocks/openrouter/server'
import { expect, openExampleWithKey, reviewPanel, runReview } from '../../m2/fixtures'

export const home = (page: Page) => page.getByRole('link', { name: 'ML System Design Trainer: home' }).click()
export const region = (page: Page, name: string) => page.getByRole('region', { name })
export const rows = (page: Page) => region(page, 'Your designs').getByTestId('design-row')
export const titleOf = (page: Page) => page.getByRole('button', { name: 'Edit Design title' })
export const value = (page: Page, sid: Parameters<typeof card>[1], key: string) => card(page, sid).getByRole('button', { name: `Edit ${key}` })
export const badge = (page: Page, sid: Parameters<typeof card>[1]) => card(page, sid).getByTestId('findings-badge')
export const reviewIndicator = (page: Page, sid: Parameters<typeof card>[1]) => card(page, sid).locator('[data-indicator="Review"]')
export const counts = (page: Page) => reviewPanel(page).getByTestId('severity-counts')
/** A finding (panel, editor) or a comment (document) by its title. */
export const finding = (scope: ReturnType<Page['locator']>, title: string) => scope.getByTestId(/^(finding|comment)$/).filter({ hasText: title })
export async function expand(f: ReturnType<Page['locator']>) {
  const b = f.locator('button[aria-expanded="false"]')
  if (await b.count()) await b.click()
}

export async function expectCounts(page: Page, critical: number, major: number, minor: number) {
  await expect(counts(page).locator('[data-count="critical"]')).toContainText(String(critical))
  await expect(counts(page).locator('[data-count="major"]')).toContainText(String(major))
  await expect(counts(page).locator('[data-count="minor"]')).toContainText(String(minor))
}

/** AT-32's result: signed in with a key, the example, a full review answered with R1. Returns the design id. */
export async function afterAT32(page: Page, delayMs = 0) {
  const id = await openExampleWithKey(page)
  await mockOpenRouter.scenario('R1', delayMs)
  await runReview(page)
  await expect(reviewPanel(page).getByRole('status')).toBeHidden()
  await expectCounts(page, 1, 2, 2)
  return id
}

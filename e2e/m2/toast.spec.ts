import { setTitle, waitSaved } from '../helpers'
import { expect, test } from './fixtures'

test('m2-ui-01: one toast at a time, bottom center, role=status; progress, success and error with actions and dismiss', async ({ page }) => {
  await page.goto('/local')
  await setTitle(page, 'Mine')
  await waitSaved(page)

  // Hold the insert to see the progress toast; fail it once to see the error toast.
  let release!: () => void
  const held = new Promise<void>((r) => (release = r))
  let fail = true
  await page.route('http://127.0.0.1:54321/rest/v1/designs*', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback()
    await held
    if (fail) return route.fulfill({ status: 500, json: { message: 'down' } })
    return route.fallback()
  })
  await page.getByRole('button', { name: 'Sign in as test user' }).click()

  const status = page.getByRole('status')
  const toast = page.getByTestId('toast')
  await expect(toast).toHaveAttribute('data-kind', 'progress')
  await expect(status).toContainText('Moving “Mine” to your account…')
  await expect(toast.getByRole('button', { name: 'Dismiss' })).toHaveCount(0)
  await expect(toast).toHaveClass(/rounded-xl/)
  await expect(toast).toHaveClass(/bg-slate-900/)
  const box = (await toast.boundingBox())!
  expect(Math.abs(box.x + box.width / 2 - 720)).toBeLessThanOrEqual(2)
  expect(900 - (box.y + box.height)).toBeCloseTo(24, 0)

  release()
  await expect(toast).toHaveAttribute('data-kind', 'error')
  await expect(status).toContainText('could not be moved to your account. It stays in this browser.')
  await expect(page.getByTestId('toast')).toHaveCount(1)

  fail = false
  await toast.getByRole('button', { name: 'Try again' }).click()
  await expect(toast).toHaveAttribute('data-kind', 'success')
  await expect(status).toContainText('“Mine” is now in your account')
  await expect(page.getByTestId('toast')).toHaveCount(1)
  await toast.getByRole('button', { name: 'Dismiss' }).click()
  await expect(page.getByTestId('toast')).toHaveCount(0)
})

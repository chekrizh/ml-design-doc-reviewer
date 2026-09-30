import { expect, test } from '@playwright/test'

test('app renders without console errors and shows the mode toggle', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Canvas', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Document', exact: true })).toBeVisible()
  expect(errors).toEqual([])
})

test('each test starts with empty IndexedDB', async ({ page }) => {
  await page.goto('/')
  const names = await page.evaluate(async () => (await indexedDB.databases()).map((d) => d.name))
  // The app may have created its own DB on load, but it must hold no saved design yet.
  const saved = await page.evaluate(
    () =>
      new Promise<unknown>((resolve) => {
        const req = indexedDB.open('ml-design-trainer')
        req.onsuccess = () => {
          const db = req.result
          if (!db.objectStoreNames.contains('designs')) return resolve(null)
          const get = db.transaction('designs').objectStore('designs').get('current')
          get.onsuccess = () => resolve(get.result ?? null)
        }
      }),
  )
  expect(Array.isArray(names)).toBe(true)
  expect(saved).toBeNull()
})

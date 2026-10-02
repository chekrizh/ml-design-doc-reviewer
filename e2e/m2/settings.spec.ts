import type { Page } from '@playwright/test'
import { answerDialog } from '../helpers'
import { VALID_KEY } from '../mocks/openrouter/server'
import { createCloudDesign, expect, openCloud, test } from './fixtures'

const settings = (page: Page) => page.getByRole('dialog', { name: 'AI Review settings' })
const aiMenu = (page: Page) => page.getByRole('menu', { name: 'AI Review' })

async function openAiMenu(page: Page) {
  await page.getByRole('button', { name: 'AI Review', exact: true }).click()
  await expect(aiMenu(page)).toBeVisible()
}

test('m2-review-05: opens from the account menu and from Add key; rejected key shows a red field; valid key shows last 4, Works, model; delete', async ({ page }) => {
  const bodies: string[] = []
  page.on('response', async (r) => {
    if (r.url().includes('127.0.0.1:54321')) bodies.push(await r.text().catch(() => ''))
  })
  await openCloud(page, await createCloudDesign('A'))

  // Add key from the AI Review menu.
  await openAiMenu(page)
  await expect(aiMenu(page)).toContainText('Add your OpenRouter key')
  await aiMenu(page).getByRole('menuitem', { name: 'Add key' }).click()
  await expect(settings(page)).toBeVisible()
  await expect(settings(page).getByRole('combobox', { name: 'Model' })).toBeDisabled()

  // A rejected key.
  const input = settings(page).getByLabel('OpenRouter key')
  await expect(input).toHaveAttribute('type', 'password')
  await input.fill('sk-or-v1-wrongkey123')
  await settings(page).getByRole('button', { name: 'Save' }).click()
  await expect(settings(page)).toContainText('OpenRouter rejected this key')
  await expect(input).toHaveAttribute('aria-invalid', 'true')
  await expect(input).toHaveClass(/border-red-300/)
  await settings(page).getByRole('button', { name: 'Close' }).first().click()
  await expect(settings(page)).toBeHidden()

  // From the account menu: still no key.
  await page.getByRole('button', { name: 'Account menu' }).click()
  await page.getByRole('menuitem', { name: 'AI Review settings' }).click()
  await expect(settings(page).getByLabel('OpenRouter key')).toHaveValue('')

  // The valid key: 'Checking…' while the request is held.
  let release!: () => void
  const held = new Promise<void>((r) => (release = r))
  await page.route('http://127.0.0.1:54321/functions/v1/openrouter-key', async (route) => {
    await held
    await route.fallback()
  })
  await settings(page).getByLabel('OpenRouter key').fill(VALID_KEY)
  await settings(page).getByRole('button', { name: 'Save' }).click()
  await expect(settings(page).getByRole('button', { name: 'Checking…' })).toBeDisabled()
  release()
  await expect(settings(page).getByTestId('saved-key')).toHaveText('sk-or-v1-••••••••a3f9')
  await expect(settings(page)).toContainText('✓ Works')
  await expect(settings(page).getByRole('button', { name: 'Replace' })).toBeVisible()

  // The model list: the recommended model selected, no prices.
  const model = settings(page).getByRole('combobox', { name: 'Model' })
  await expect(model).toBeEnabled()
  await expect(model).toHaveValue('google/gemini-2.5-flash')
  await expect(model.locator('option')).toHaveText(['Google: Gemini 2.5 Flash — Recommended', 'Anthropic: Claude Sonnet 4.5', 'OpenAI: GPT-4o-mini'])
  await expect(settings(page)).not.toContainText('$')

  // The full key appears nowhere: not in the page, not in a response, not after a reload.
  expect(await page.content()).not.toContain(VALID_KEY)
  await page.reload()
  await openAiMenu(page)
  await expect(aiMenu(page).getByRole('menuitem', { name: 'Review whole design' })).toBeVisible()
  await aiMenu(page).getByRole('menuitem', { name: 'Settings' }).click()
  await expect(settings(page).getByTestId('saved-key')).toHaveText('sk-or-v1-••••••••a3f9')
  expect(await page.content()).not.toContain(VALID_KEY)
  expect(bodies.join('\n')).not.toContain(VALID_KEY)

  // Delete, confirm → the menu asks for a key again.
  await settings(page).getByRole('button', { name: 'Delete' }).click()
  await answerDialog(page, 'Delete')
  await expect(settings(page).getByLabel('OpenRouter key')).toBeVisible()
  await settings(page).getByRole('button', { name: 'Close' }).first().click()
  await openAiMenu(page)
  await expect(aiMenu(page)).toContainText('Add your OpenRouter key')
})

test('m2-review-05: choosing a model is saved for the user', async ({ page }) => {
  await openCloud(page, await createCloudDesign('A'))
  await page.getByRole('button', { name: 'Account menu' }).click()
  await page.getByRole('menuitem', { name: 'AI Review settings' }).click()
  await settings(page).getByLabel('OpenRouter key').fill(VALID_KEY)
  await settings(page).getByRole('button', { name: 'Save' }).click()
  await settings(page).getByRole('combobox', { name: 'Model' }).selectOption('openai/gpt-4o-mini')
  await page.reload()
  await page.getByRole('button', { name: 'Account menu' }).click()
  await page.getByRole('menuitem', { name: 'AI Review settings' }).click()
  await expect(settings(page).getByRole('combobox', { name: 'Model' })).toHaveValue('openai/gpt-4o-mini')
})

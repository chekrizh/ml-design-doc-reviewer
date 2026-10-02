import { answerDialog, card, closeEditor, dialog, openDetails, toMode } from '../../helpers'
import { mockOpenRouter, VALID_KEY } from '../../mocks/openrouter/server'
import { createCloudDesign, expect, openCloud, openExampleWithKey, reviewPanel, runReview, saveTestKey, test } from '../../m2/fixtures'
import { afterAT32, badge, expand, expectCounts, finding, reviewIndicator } from './setup'

const aiMenu = (page: import('@playwright/test').Page) => page.getByRole('menu', { name: 'AI Review' })
const settings = (page: import('@playwright/test').Page) => page.getByRole('dialog', { name: 'AI Review settings' })
const openAi = (page: import('@playwright/test').Page) => page.getByRole('button', { name: 'AI Review', exact: true }).click()

test('AT-30 AI Review without sign-in and without a key', async ({ page }) => {
  // 1. Guest.
  await page.goto('/local')
  await openAi(page)
  await expect(aiMenu(page)).toContainText('Sign in to run AI review')
  await expect(aiMenu(page).getByRole('button', { name: 'Sign in with Google' })).toBeVisible()
  await expect(aiMenu(page)).not.toContainText('Review whole design')
  // 2. Signed in, no key: 'Add your OpenRouter key'; 'Add key' opens the settings.
  await openCloud(page, await createCloudDesign('A'))
  await openAi(page)
  await expect(aiMenu(page)).toContainText('Add your OpenRouter key')
  await aiMenu(page).getByRole('menuitem', { name: 'Add key' }).click()
  await expect(settings(page)).toBeVisible()
  await settings(page).getByRole('button', { name: 'Close' }).first().click()
  // 3. With a key: Review whole design and the 9 sections under Review one section.
  await saveTestKey()
  await page.reload()
  await openAi(page)
  await expect(aiMenu(page).getByRole('menuitem', { name: 'Review whole design' })).toBeVisible()
  await expect(aiMenu(page)).toContainText('Review one section')
  await expect(aiMenu(page).getByRole('group', { name: 'Review one section' }).getByRole('menuitem')).toHaveCount(9)
})

test('AT-31 OpenRouter key', async ({ page }) => {
  const bodies: string[] = []
  page.on('response', async (r) => {
    if (r.url().includes('127.0.0.1:54321')) bodies.push(await r.text().catch(() => ''))
  })
  await openCloud(page, await createCloudDesign('A'))
  await page.getByRole('button', { name: 'Account menu' }).click()
  await page.getByRole('menuitem', { name: 'AI Review settings' }).click()
  // 1. A wrong key is rejected; after closing and opening again there is no key.
  await settings(page).getByLabel('OpenRouter key').fill('sk-or-v1-wrong')
  await settings(page).getByRole('button', { name: 'Save' }).click()
  await expect(settings(page)).toContainText('OpenRouter rejected this key')
  await settings(page).getByRole('button', { name: 'Close' }).first().click()
  await page.getByRole('button', { name: 'Account menu' }).click()
  await page.getByRole('menuitem', { name: 'AI Review settings' }).click()
  await expect(settings(page).getByLabel('OpenRouter key')).toHaveValue('')
  await expect(settings(page).getByTestId('saved-key')).toHaveCount(0)
  // 2. The valid key: 'a3f9' and 'Works'; the full key is nowhere in the page or the server's answers.
  await settings(page).getByLabel('OpenRouter key').fill(VALID_KEY)
  await settings(page).getByRole('button', { name: 'Save' }).click()
  await expect(settings(page).getByTestId('saved-key')).toContainText('a3f9')
  await expect(settings(page)).toContainText('Works')
  expect(await page.locator('body').innerText()).not.toContain(VALID_KEY)
  // 3. The default model is selected; no prices.
  const model = settings(page).getByRole('combobox', { name: 'Model' })
  await expect(model).toHaveValue('google/gemini-2.5-flash')
  await expect(model.locator('option:checked')).toContainText('Recommended')
  await expect(settings(page)).not.toContainText('$')
  await page.reload()
  await page.getByRole('button', { name: 'Account menu' }).click()
  await page.getByRole('menuitem', { name: 'AI Review settings' }).click()
  await expect(settings(page).getByTestId('saved-key')).toContainText('a3f9')
  expect(await page.locator('body').innerText()).not.toContain(VALID_KEY)
  expect(await page.content()).not.toContain(VALID_KEY)
  expect(bodies.join('\n')).not.toContain(VALID_KEY)
  // 4. Delete, confirm → AI Review asks for a key again.
  await settings(page).getByRole('button', { name: 'Delete' }).click()
  await answerDialog(page, 'Delete')
  await settings(page).getByRole('button', { name: 'Close' }).first().click()
  await openAi(page)
  await expect(aiMenu(page)).toContainText('Add your OpenRouter key')
})

test('AT-32 full review: signals on the canvas', async ({ page }) => {
  await openExampleWithKey(page)
  await mockOpenRouter.scenario('R1', 2000)
  await runReview(page)
  // 1. While running: the Review panel with 'Reviewing' and Cancel.
  const status = reviewPanel(page).getByRole('status')
  await expect(status).toContainText('Reviewing')
  await expect(status.getByRole('button', { name: 'Cancel' })).toBeVisible()
  await expect(status).toBeHidden({ timeout: 10_000 })
  // 2. Counts: 1 critical, 2 major, 2 minor.
  await expectCounts(page, 1, 2, 2)
  // 3. Evaluation (Online): red with '!', '3 findings'.
  await expect(reviewIndicator(page, 'evaluation-online')).toHaveAttribute('data-state', 'red')
  await expect(reviewIndicator(page, 'evaluation-online').locator('[data-alert]')).toHaveCount(1)
  await expect(badge(page, 'evaluation-online')).toHaveText('3 findings')
  // 4. Problem Space: green with a check, '1 finding'.
  await expect(reviewIndicator(page, 'problem-space')).toHaveAttribute('data-state', 'green')
  await expect(reviewIndicator(page, 'problem-space').locator('[data-check]')).toHaveCount(1)
  await expect(badge(page, 'problem-space')).toHaveText('1 finding')
  // 5. Baseline: green with a check, no badge.
  await expect(reviewIndicator(page, 'baseline')).toHaveAttribute('data-state', 'green')
  await expect(reviewIndicator(page, 'baseline').locator('[data-check]')).toHaveCount(1)
  await expect(badge(page, 'baseline')).toHaveCount(0)
  // 6. The first group is Whole design with 'Out-of-stock is called costlier…'.
  const first = reviewPanel(page).getByTestId('review-findings').locator('section').first()
  await expect(first).toHaveAttribute('aria-label', 'Whole design')
  await expect(first).toContainText('Out-of-stock is called costlier')
  // 7. In Evaluation (Online) the minor finding is folded into 'minor — show'.
  await expect(reviewPanel(page).getByRole('region', { name: 'Evaluation (Online)' }).getByRole('button', { name: /minor — show/ })).toBeVisible()
  // 8. Three PNGs went to the model: Validation, Data & Features, Integration.
  const sent = await mockOpenRouter.lastRequest()
  const parts = sent.body.messages[1].content as { type: string; text?: string; image_url?: { url: string } }[]
  const images = parts.filter((p) => p.type === 'image_url')
  expect(images).toHaveLength(3)
  for (const im of images) expect(im.image_url!.url).toMatch(/^data:image\/png;base64,/)
  expect(parts.filter((_, i) => parts[i + 1]?.type === 'image_url').map((p) => p.text)).toEqual([
    'Diagram of section Validation [section:validation]',
    'Diagram of section Data & Features [section:data-features]',
    'Diagram of section Integration [section:integration]',
  ])
})

test('AT-33 a finding: details, Fix, navigation', async ({ page }) => {
  await afterAT32(page)
  // 1. Expand: 'What the design says', 'Why it matters', no Fix text; Show fix shows it.
  const f = finding(reviewPanel(page), 'Average check does not measure the stated goal')
  await expand(f)
  await expect(f).toContainText('What the design says')
  await expect(f).toContainText('Why it matters')
  await expect(f).not.toContainText('Make the primary metric waste plus lost sales')
  await f.getByRole('button', { name: 'Show fix' }).click()
  await expect(f).toContainText('Make the primary metric waste plus lost sales')
  // 2. The Evaluation (Online) card is in view.
  await expect(card(page, 'evaluation-online')).toBeInViewport()
  // 3. Close the panel, click the Problem Space badge → the panel opens with 'Antigoals are not stated' expanded.
  await reviewPanel(page).getByRole('button', { name: 'Close review' }).click()
  await expect(reviewPanel(page)).toBeHidden()
  await badge(page, 'problem-space').click()
  await expect(reviewPanel(page)).toBeVisible()
  await expect(finding(reviewPanel(page), 'Antigoals are not stated').locator('button[aria-expanded="true"]')).toBeVisible()
})

test('AT-34 a finding status is the same everywhere', async ({ page }) => {
  await afterAT32(page)
  const panel = reviewPanel(page)
  // 1. Resolve the critical in the panel → badge '2 findings', still red.
  const crit = finding(panel, 'Average check does not measure the stated goal')
  await expand(crit)
  await crit.getByRole('button', { name: 'Resolve' }).click()
  await expect(badge(page, 'evaluation-online')).toHaveText('2 findings')
  await expect(reviewIndicator(page, 'evaluation-online')).toHaveAttribute('data-state', 'red')
  // 2. Details: Open has 2, Resolved has the critical; no marker at Key Metric.
  await openDetails(page, 'evaluation-online')
  const col = dialog(page).getByRole('complementary', { name: 'Findings' })
  await expect(col.getByTestId('finding')).toHaveCount(2)
  await expect(dialog(page).locator('[data-field="evaluation-online:kp:evaluation-online-p1"]').getByTestId('field-marker')).toHaveCount(0)
  await col.getByRole('tab', { name: /^Resolved/ }).click()
  await expect(col.getByTestId('finding')).toHaveCount(1)
  await expect(col.getByTestId('finding')).toContainText('Average check does not measure the stated goal')
  // 3. Dismiss the major in Details → badge '1 finding', green; the panel's Dismissed tab has it.
  await col.getByRole('tab', { name: /^Open/ }).click()
  const split = finding(col, 'Split by distribution center leaves too few units')
  await expand(split)
  await split.getByRole('button', { name: 'Dismiss' }).click()
  await closeEditor(page)
  await expect(badge(page, 'evaluation-online')).toHaveText('1 finding')
  await expect(reviewIndicator(page, 'evaluation-online')).toHaveAttribute('data-state', 'green')
  await panel.getByRole('tab', { name: /^Dismissed/ }).click()
  await expect(finding(panel, 'Split by distribution center leaves too few units')).toHaveCount(1)
  await panel.getByRole('tab', { name: /^Open/ }).click()
  // 4. Document: neither is in Open; the critical is in Resolved; Reopen → canvas badge '2 findings', red.
  await toMode(page, 'Document')
  const comments = page.getByRole('complementary', { name: 'Comments' })
  await expect(finding(comments, 'Average check does not measure the stated goal')).toHaveCount(0)
  await expect(finding(comments, 'Split by distribution center leaves too few units')).toHaveCount(0)
  await comments.getByRole('tab', { name: /^Resolved/ }).click()
  const resolved = finding(comments, 'Average check does not measure the stated goal')
  await expect(resolved).toHaveCount(1)
  await resolved.getByRole('button', { name: 'Reopen' }).click()
  await toMode(page, 'Canvas')
  await expect(badge(page, 'evaluation-online')).toHaveText('2 findings')
  await expect(reviewIndicator(page, 'evaluation-online')).toHaveAttribute('data-state', 'red')
})

test('AT-35 markers in the Component Editor', async ({ page }) => {
  await afterAT32(page)
  await openDetails(page, 'evaluation-online')
  const d = dialog(page)
  // 1. Markers at Key Metric, the matrix row 'Split by distribution center' and the Rationale heading only.
  await expect(d.locator('[data-field="evaluation-online:kp:evaluation-online-p1"]').getByTestId('field-marker')).toHaveCount(1)
  for (const other of ['p0', 'p2', 'p3']) await expect(d.locator(`[data-field="evaluation-online:kp:evaluation-online-${other}"]`).getByTestId('field-marker')).toHaveCount(0)
  // The matrix row whose option name reads 'Split by distribution center'.
  const rows = d.getByRole('table', { name: 'Trade-off matrix' }).locator('tbody tr')
  const names = await rows.evaluateAll((trs) => trs.map((tr) => (tr.querySelector('input[aria-label$=" name"]') as HTMLInputElement).value))
  const row = rows.nth(names.indexOf('Split by distribution center'))
  await expect(row.getByTestId('field-marker')).toHaveCount(1)
  await expect(d.getByRole('region', { name: 'Rationale & Notes' }).locator('h3 + [data-testid="field-marker"]')).toHaveCount(1)
  await expect(d.getByTestId('field-marker')).toHaveCount(3)
  // 2. The row marker expands 'Split by distribution center leaves too few units…'.
  await row.getByTestId('field-marker').click()
  const col = d.getByRole('complementary', { name: 'Findings' })
  await expect(finding(col, 'Split by distribution center leaves too few units').locator('button[aria-expanded="true"]')).toBeVisible()
  // 3. 'Review this section' in the Findings column.
  await expect(col.getByRole('button', { name: 'Review this section' })).toBeVisible()
})

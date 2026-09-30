import { expect, test } from '@playwright/test'
import {
  addCriterion, addOption, card, cardBox, closeEditor, dialog, docSection, downloadText, dragCard, drawRectangle,
  exportMarkdown, indicator, loadExample, openApp, openDetails, SECTION_ORDER, setCardValue, setTitle, toMode,
} from '../helpers'

const names = SECTION_ORDER.map(([, n]) => n)

test('AT-01 end-to-end path from empty design to Markdown', async ({ page }) => {
  await openApp(page)
  await setTitle(page, 'Fraud Detection')
  await setCardValue(page, 'problem-space', 'Domain', 'Payments')
  await setCardValue(page, 'problem-space', 'Business Goal', 'Cut fraud losses by 20%')
  await openDetails(page, 'baseline')
  const d = dialog(page)
  await d.getByRole('textbox', { name: 'Property 1 value' }).fill('Rules')
  await d.getByRole('textbox', { name: 'Rationale' }).fill('Rules are cheap to start')
  await addCriterion(d, 'Cost')
  await addOption(d, 'Rules', ['Low'])
  await addOption(d, 'Logistic Regression', ['Medium'])
  await d.getByRole('button', { name: 'Choose option 1' }).click()
  await closeEditor(page)
  await toMode(page, 'Document')

  await expect(page.getByTestId('document').getByRole('heading', { level: 1 })).toHaveText('Fraud Detection')
  const ps = docSection(page, 'problem-space')
  await expect(ps).toContainText('Payments')
  await expect(ps).toContainText('Cut fraud losses by 20%')
  const b = docSection(page, 'baseline')
  await expect(b.getByTestId('key-properties')).toContainText('Rules')
  await expect(b).toContainText('Rules are cheap to start')
  const table = b.getByRole('table', { name: 'Trade-off matrix' })
  await expect(table.getByRole('textbox', { name: 'Option 1 name' })).toHaveValue('Rules')
  await expect(table.getByRole('textbox', { name: 'Option 2 name' })).toHaveValue('Logistic Regression')
  await expect(table.getByRole('button', { name: 'Choose option 1' })).toHaveAttribute('aria-pressed', 'true')
  await expect(table.getByRole('button', { name: 'Choose option 2' })).toHaveAttribute('aria-pressed', 'false')
  await expect(table.locator('tbody tr').nth(0)).toContainText('(chosen)')

  const { warning, download } = await exportMarkdown(page, 'accept')
  expect(warning).toMatch(/empty/)
  expect(download!.suggestedFilename()).toBe('fraud-detection.md')
  const md = await downloadText(download!)
  for (const v of ['Fraud Detection', 'Payments', 'Cut fraud losses by 20%', 'Rules', 'Rules are cheap to start', 'Logistic Regression'])
    expect(md).toContain(v)
  expect(md).toContain('✅ Rules (chosen)')
})

test('AT-02 sync canvas to document', async ({ page }) => {
  await openApp(page)
  await setCardValue(page, 'monitoring', 'Data Drift', 'PSI < 0.2')
  await toMode(page, 'Document')
  await expect(docSection(page, 'monitoring')).toContainText('PSI < 0.2')
})

test('AT-03 sync document to canvas', async ({ page }) => {
  await openApp(page)
  await loadExample(page)
  await toMode(page, 'Document')
  const integ = docSection(page, 'integration')
  await integ.getByRole('button', { name: 'Edit Inference Pattern' }).click()
  await integ.getByRole('textbox', { name: 'Inference Pattern' }).fill('Streaming')
  await integ.getByRole('textbox', { name: 'Inference Pattern' }).press('Enter')
  await integ.getByRole('textbox', { name: 'Integration rationale' }).click()
  await page.keyboard.press('ControlOrMeta+End')
  await page.keyboard.type(' Needs Kafka')
  await docSection(page, 'baseline').getByRole('textbox', { name: 'Cell 1,1' }).fill('Changed')
  await toMode(page, 'Canvas')

  await expect(card(page, 'integration').getByRole('button', { name: 'Edit Inference Pattern' })).toHaveText('Streaming')
  await openDetails(page, 'integration')
  await expect(dialog(page).getByRole('textbox', { name: 'Rationale' })).toContainText('Needs Kafka')
  await closeEditor(page)
  await openDetails(page, 'baseline')
  await expect(dialog(page).getByRole('textbox', { name: 'Cell 1,1' })).toHaveValue('Changed')
})

test('AT-04 trade-offs indicator follows the strict rule', async ({ page }) => {
  await openApp(page)
  await openDetails(page, 'evaluation-offline')
  const d = dialog(page)
  // The scales icon in the card's top-right corner: off = grey, on = green with a check mark.
  const ind = indicator(card(page, 'evaluation-offline'), 'Trade-offs')
  const offColor = await ind.evaluate((e) => getComputedStyle(e).color)
  const expectOff = async () => {
    await expect(ind).toHaveAttribute('data-state', 'off')
    await expect(ind.locator('[data-check]')).toHaveCount(0)
    await expect(ind).toHaveCSS('color', offColor)
  }
  const expectOn = async () => {
    await expect(ind).toHaveAttribute('data-state', 'on')
    await expect(ind.locator('[data-check]')).toBeVisible()
    await expect(ind).not.toHaveCSS('color', offColor)
  }
  // 1. One option, one criterion, cell filled, option chosen -> off.
  await addCriterion(d, 'Recall')
  await addOption(d, 'PR-AUC', ['High'])
  await d.getByRole('button', { name: 'Choose option 1' }).click()
  await expectOff()
  // 2. Second option with its cell filled, choice untouched -> on.
  await addOption(d, 'ROC-AUC', ['Medium'])
  await expect(d.getByRole('button', { name: 'Choose option 1' })).toHaveAttribute('aria-pressed', 'true')
  await expectOn()
  // 3. Clear one cell -> off.
  await d.getByRole('textbox', { name: 'Cell 2,1' }).fill('')
  await expectOff()
  // 4. Fill it back -> on.
  await d.getByRole('textbox', { name: 'Cell 2,1' }).fill('Medium')
  await expectOn()
  // 5. Unmark the choice -> off.
  await d.getByRole('button', { name: 'Choose option 1' }).click()
  await expect(d.getByRole('button', { name: 'Choose option 1' })).toHaveAttribute('aria-pressed', 'false')
  await expectOff()
  // 5b. Deleting the chosen option also turns it off.
  await d.getByRole('button', { name: 'Choose option 2' }).click()
  await expectOn()
  await d.getByRole('button', { name: 'Delete option 2' }).click()
  await expectOff()
  // 6. Two options, zero criteria -> off.
  await addOption(d, 'ROC-AUC', ['Medium'])
  await d.getByRole('button', { name: 'Choose option 1' }).click()
  await expectOn()
  await d.getByRole('button', { name: 'Delete criterion 1' }).click()
  await expect(d.getByRole('textbox', { name: /^Option \d+ name$/ })).toHaveCount(2)
  await expect(d.getByRole('textbox', { name: /^Criterion \d+ name$/ })).toHaveCount(0)
  await expectOff()
})

test('AT-05 diagram: thumbnail only on its card, no Diagram indicator, document', async ({ page }) => {
  await openApp(page)
  await openDetails(page, 'validation')
  await drawRectangle(page)
  await closeEditor(page)
  await expect(card(page, 'validation').getByTestId('thumbnail').getByRole('img')).toBeVisible()
  for (const [sid] of SECTION_ORDER) {
    if (sid !== 'validation') await expect(card(page, sid).getByTestId('thumbnail')).toHaveCount(0)
    await expect(indicator(card(page, sid), 'Diagram')).toHaveCount(0)
  }
  await toMode(page, 'Document')
  const v = docSection(page, 'validation')
  await expect(v.getByRole('img', { name: 'Validation diagram' })).toBeVisible()
  await expect(v.getByText('Not filled yet')).toHaveCount(0)
})

test('AT-06 sections and template keys', async ({ page }) => {
  await openApp(page)
  // Reading order of the cards on screen: top to bottom, left to right.
  const boxes = await Promise.all(
    SECTION_ORDER.map(async ([sid]) => ({ name: await card(page, sid).getByRole('heading').innerText(), ...(await cardBox(page, sid)) })),
  )
  const visual = [...boxes].sort((a, b) => a.y - b.y || a.x - b.x).map((b) => b.name)
  expect(visual.map((n) => n.toLowerCase())).toEqual(names.map((n) => n.toLowerCase()))
  await expect(page.locator('article[aria-label]')).toHaveCount(9)
  expect(await page.locator('article[aria-label]').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')))).toEqual(names)

  const expected: Record<string, string[]> = {
    'problem-space': ['Domain', 'Business Goal', 'ML Task', 'Constraints'],
    'evaluation-offline': ['Offline Metric', 'Loss', 'Target Value'],
    baseline: ['Approach', 'Baseline Metric'],
    validation: [],
    'data-features': ['Sources', 'Key Features'],
    'evaluation-online': ['Evaluation Type', 'Key Metric'],
    integration: ['Inference Pattern', 'Output', 'Latency Budget'],
    monitoring: ['Data Drift', 'Model Quality', 'Alerting'],
    'target-solution': ['Model Type'],
  }
  for (const [sid] of SECTION_ORDER) {
    await expect(card(page, sid).locator('dt')).toHaveText(expected[sid])
    await openDetails(page, sid)
    const keys = await dialog(page).getByRole('textbox', { name: /^Property \d+ key$/ }).evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value))
    expect(keys).toEqual(expected[sid])
    await closeEditor(page)
  }

  await expect(page.locator('body')).not.toContainText('Evaluation Strategy')
  await toMode(page, 'Document')
  await expect(page.locator('body')).not.toContainText('Evaluation Strategy')
})

test('AT-07 document keeps canonical order after reordering cards', async ({ page }) => {
  await openApp(page)
  await loadExample(page)
  const ps = await cardBox(page, 'problem-space')
  await dragCard(page, 'monitoring', 'problem-space')
  expect(await cardBox(page, 'monitoring')).toMatchObject({ x: ps.x, y: ps.y })
  await toMode(page, 'Document')
  await expect(page.getByTestId('document').getByRole('heading', { level: 2 })).toHaveText(names.map((n, i) => `${i + 1}. ${n}`))
  await expect(page.getByRole('navigation', { name: 'On this page' }).getByRole('link')).toHaveText(names)
  await expect(page.getByTestId('document').getByRole('heading', { level: 2 }).first()).toHaveText('1. Problem Space')
})

test('AT-08 choosing an option does not touch key properties', async ({ page }) => {
  await openApp(page)
  await setCardValue(page, 'target-solution', 'Model Type', 'XGBoost')
  await openDetails(page, 'target-solution')
  const d = dialog(page)
  await addCriterion(d, 'Accuracy')
  await addOption(d, 'CatBoost', ['High'])
  await addOption(d, 'XGBoost', ['High'])
  await d.getByRole('button', { name: 'Choose option 1' }).click()
  await expect(d.getByRole('button', { name: 'Choose option 1' })).toHaveAttribute('aria-pressed', 'true')
  await expect(d.getByRole('textbox', { name: 'Property 1 value' })).toHaveValue('XGBoost')
  await expect(card(page, 'target-solution').getByRole('button', { name: 'Edit Model Type' })).toHaveText('XGBoost')
  await closeEditor(page)
  await expect(card(page, 'target-solution').getByRole('button', { name: 'Edit Model Type' })).toHaveText('XGBoost')
})

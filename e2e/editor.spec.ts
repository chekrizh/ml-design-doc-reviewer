import { expect, test } from '@playwright/test'
import { addCriterion, addOption, card, closeEditor, dialog, drawRectangle, indicator, openApp, openDetails, reload, SECTION_ORDER } from './helpers'

test('editor-01 modal title, close by X/Escape/outside, saved indicator, parts in order', async ({ page }) => {
  await openApp(page)
  for (const [sid, name] of SECTION_ORDER) {
    await openDetails(page, sid)
    await expect(dialog(page)).toHaveAccessibleName(name)
    await expect(dialog(page).getByRole('heading', { level: 2, name, exact: true })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog(page)).toBeHidden()
  }
  await openDetails(page, 'baseline')
  await closeEditor(page)
  await openDetails(page, 'baseline')
  await page.getByTestId('editor-overlay').click({ position: { x: 10, y: 10 } })
  await expect(dialog(page)).toBeHidden()

  await openDetails(page, 'baseline')
  const saved = dialog(page).getByTestId('save-state')
  await expect(saved).toContainText('Saved')
  await dialog(page).getByRole('textbox', { name: 'Property 1 value' }).fill('Rules')
  await expect(saved).toHaveText('Saving…')
  await expect(saved).toContainText('Saved')
  await expect(dialog(page).locator('section:has(> div > h3) > div > h3')).toHaveText([
    'Decisions & Properties',
    'Rationale & Notes',
    'Trade-off Matrix',
    'Whiteboard',
  ])
})

test('editor-02 add, edit and delete properties; card updates immediately', async ({ page }) => {
  await openApp(page)
  await openDetails(page, 'validation')
  const d = dialog(page)
  await d.getByRole('button', { name: '+ Add Property' }).click()
  await expect(d.getByRole('textbox', { name: 'Property 1 key' })).toHaveValue('')
  await expect(d.getByRole('textbox', { name: 'Property 1 value' })).toHaveValue('')
  await d.getByRole('textbox', { name: 'Property 1 key' }).fill('Strategy')
  await d.getByRole('textbox', { name: 'Property 1 value' }).fill('OOT Split')
  const c = card(page, 'validation')
  await expect(c.getByText('Strategy')).toBeVisible()
  await expect(c.getByRole('button', { name: 'Edit Strategy' })).toHaveText('OOT Split')
  await closeEditor(page)

  await openDetails(page, 'baseline')
  await d.getByRole('textbox', { name: 'Property 1 key' }).fill('Method')
  await expect(card(page, 'baseline').getByText('Method')).toBeVisible()
  await expect(card(page, 'baseline').getByText('Approach')).toHaveCount(0)
  await d.getByRole('button', { name: 'Delete property 2' }).click()
  await expect(d.getByRole('textbox', { name: /^Property \d+ key$/ })).toHaveCount(1)
  await expect(card(page, 'baseline').getByText('Baseline Metric')).toHaveCount(0)
})

test('editor-03 rationale rich text: formatting tools and persistence', async ({ page }) => {
  await openApp(page)
  await openDetails(page, 'baseline')
  const d = dialog(page)
  for (const name of ['Bold', 'Italic', 'Inline code', 'Bullet list', 'Ordered list', 'Link'])
    await expect(d.getByRole('button', { name, exact: true })).toBeEnabled()
  const editor = d.getByRole('textbox', { name: 'Rationale' })
  await editor.click()
  await d.getByRole('button', { name: 'Bold', exact: true }).click()
  await page.keyboard.type('Strong')
  await d.getByRole('button', { name: 'Bold', exact: true }).click()
  await d.getByRole('button', { name: 'Italic', exact: true }).click()
  await page.keyboard.type(' slanted')
  await d.getByRole('button', { name: 'Italic', exact: true }).click()
  await d.getByRole('button', { name: 'Inline code', exact: true }).click()
  await page.keyboard.type(' fit()')
  await d.getByRole('button', { name: 'Inline code', exact: true }).click()
  await page.keyboard.press('Enter')
  await d.getByRole('button', { name: 'Bullet list', exact: true }).click()
  await page.keyboard.type('point')
  await page.keyboard.press('Enter')
  await page.keyboard.press('Enter')
  await d.getByRole('button', { name: 'Ordered list', exact: true }).click()
  await page.keyboard.type('step')
  await page.keyboard.press('Enter')
  await page.keyboard.press('Enter')
  await page.keyboard.type('docs')
  for (let i = 0; i < 4; i++) await page.keyboard.press('Shift+ArrowLeft')
  page.once('dialog', (dlg) => dlg.accept('https://example.com'))
  await d.getByRole('button', { name: 'Link', exact: true }).click()

  const check = async () => {
    const ed = dialog(page).getByRole('textbox', { name: 'Rationale' })
    await expect(ed.locator('strong')).toHaveText('Strong')
    await expect(ed.locator('em')).toHaveText(' slanted')
    await expect(ed.locator('code')).toHaveText(' fit()')
    await expect(ed.locator('ul li')).toHaveText('point')
    await expect(ed.locator('ol li')).toHaveText('step')
    await expect(ed.locator('a')).toHaveText('docs')
    await expect(ed.locator('a')).toHaveAttribute('href', 'https://example.com')
  }
  await check()
  await closeEditor(page)
  await reload(page)
  await openDetails(page, 'baseline')
  await check()
})

test('editor-04 image button is disabled with Coming soon tooltip', async ({ page }) => {
  await openApp(page)
  await openDetails(page, 'baseline')
  const img = dialog(page).getByRole('button', { name: /Image/ })
  await expect(img).toBeDisabled()
  await expect(img.locator('xpath=..')).toHaveAttribute('title', 'Coming soon')
})

test('editor-05 matrix: add, edit and delete rows and columns', async ({ page }) => {
  await openApp(page)
  await openDetails(page, 'baseline')
  const d = dialog(page)
  await addCriterion(d, 'Cost')
  await addCriterion(d, 'Speed')
  await addOption(d, 'Rules', ['Low', 'Fast'])
  await addOption(d, 'GBM', ['Mid', 'Slow'])
  await expect(d.getByRole('textbox', { name: 'Criterion 2 name' })).toHaveValue('Speed')
  await expect(d.getByRole('textbox', { name: 'Option 2 name' })).toHaveValue('GBM')
  await expect(d.getByRole('textbox', { name: 'Cell 2,2' })).toHaveValue('Slow')
  await d.getByRole('textbox', { name: 'Cell 2,2' }).fill('Medium')
  await expect(d.getByRole('textbox', { name: 'Cell 2,2' })).toHaveValue('Medium')
  await d.getByRole('button', { name: 'Delete criterion 1' }).click()
  await expect(d.getByRole('textbox', { name: /^Criterion \d+ name$/ })).toHaveCount(1)
  await expect(d.getByRole('textbox', { name: 'Criterion 1 name' })).toHaveValue('Speed')
  await expect(d.getByRole('textbox', { name: 'Cell 1,1' })).toHaveValue('Fast')
  await d.getByRole('button', { name: 'Delete option 1' }).click()
  await expect(d.getByRole('textbox', { name: /^Option \d+ name$/ })).toHaveCount(1)
  await expect(d.getByRole('textbox', { name: 'Option 1 name' })).toHaveValue('GBM')
})

test('editor-06 exactly one chosen option, highlighted, indicator live, key properties untouched', async ({ page }) => {
  await openApp(page)
  await openDetails(page, 'target-solution')
  const d = dialog(page)
  await d.getByRole('textbox', { name: 'Property 1 value' }).fill('XGBoost')
  await addCriterion(d, 'Cost')
  await addOption(d, 'CatBoost', ['Low'])
  await addOption(d, 'XGBoost', ['Low'])
  const ind = indicator(card(page, 'target-solution'), 'Trade-offs')
  await expect(ind).toHaveAttribute('data-state', 'off')
  await d.getByRole('button', { name: 'Choose option 1' }).click()
  await expect(ind).toHaveAttribute('data-state', 'on')
  const rows = d.locator('tbody tr')
  await expect(rows.nth(0)).toHaveAttribute('data-chosen', 'true')
  await expect(rows.nth(0)).toHaveClass(/bg-indigo-50/)
  await d.getByRole('button', { name: 'Choose option 2' }).click()
  await expect(d.getByRole('button', { name: /^Choose option/, pressed: true })).toHaveCount(1)
  await expect(rows.nth(1)).toHaveAttribute('data-chosen', 'true')
  await expect(rows.nth(0)).toHaveAttribute('data-chosen', 'false')
  await d.getByRole('textbox', { name: 'Cell 1,1' }).fill('')
  await expect(ind).toHaveAttribute('data-state', 'off')
  await d.getByRole('textbox', { name: 'Cell 1,1' }).fill('Low')
  await expect(ind).toHaveAttribute('data-state', 'on')
  await expect(d.getByRole('textbox', { name: 'Property 1 value' })).toHaveValue('XGBoost')
  await expect(card(page, 'target-solution').getByRole('button', { name: 'Edit Model Type' })).toHaveText('XGBoost')
})

test('editor-07 Excalidraw component (no iframe) in every section; drawing persists and updates the card', async ({ page }) => {
  await openApp(page)
  for (const [sid] of SECTION_ORDER) {
    await openDetails(page, sid)
    await expect(dialog(page).getByTestId('whiteboard').locator('.excalidraw')).toBeVisible()
    await expect(dialog(page).locator('iframe')).toHaveCount(0)
    await closeEditor(page)
  }
  await openDetails(page, 'integration')
  await drawRectangle(page)
  await closeEditor(page)
  const c = card(page, 'integration')
  await expect(c.getByTestId('thumbnail').locator('img')).toBeVisible()
  await reload(page)
  await expect(c.getByTestId('thumbnail').locator('img')).toBeVisible()
  await openDetails(page, 'integration')
  await expect.poll(() => dialog(page).getByTestId('whiteboard').evaluate(() => {
    // The restored scene is drawn on the static canvas; a non-blank pixel means the rectangle is there.
    const cv = document.querySelector<HTMLCanvasElement>('[data-testid="whiteboard"] canvas.static')!
    const data = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data
    for (let i = 0; i < data.length; i += 4) if (data[i] < 200) return true
    return false
  })).toBe(true)
})

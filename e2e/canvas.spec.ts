import { expect, test } from '@playwright/test'
import {
  card, cardBox, closeEditor, dialog, docSection, dragCard, drawRectangle, indicator, loadExample, openApp,
  openDetails, reload, resizeCard, SECTION_ORDER, setCardValue, setTitle, toMode, addCriterion, addOption,
} from './helpers'

test('canvas-01 header has title, toggle and export controls, no social UI', async ({ page }) => {
  await openApp(page)
  const header = page.locator('header').first()
  await expect(header.getByRole('button', { name: 'Edit Design title' })).toBeVisible()
  await expect(header.getByRole('button', { name: 'Canvas', exact: true })).toBeVisible()
  await expect(header.getByRole('button', { name: 'Document', exact: true })).toBeVisible()
  await expect(header.getByRole('button', { name: 'Export Markdown' })).toBeVisible()
  await expect(header.getByRole('button', { name: 'Export PDF' })).toBeVisible()
  await expect(header.getByText(/share|contributor/i)).toHaveCount(0)
  await expect(header.locator('img')).toHaveCount(0)
})

test('canvas-02 title: click to edit, Enter saves, Escape cancels, persists', async ({ page }) => {
  await openApp(page)
  const title = page.getByRole('button', { name: 'Edit Design title' })
  await expect(title).toHaveText('Untitled design')
  await setTitle(page, 'Fraud Detection')
  await expect(title).toHaveText('Fraud Detection')
  await title.click()
  await page.getByRole('textbox', { name: 'Design title' }).fill('Other')
  await page.getByRole('textbox', { name: 'Design title' }).press('Escape')
  await expect(title).toHaveText('Fraud Detection')
  await reload(page)
  await expect(title).toHaveText('Fraud Detection')
  await setTitle(page, '')
  await expect(title).toHaveText('Untitled design')
})

test('canvas-03 nine cards with icon and uppercase name in mockup layout', async ({ page }) => {
  await openApp(page)
  for (const [sid, name] of SECTION_ORDER) {
    const c = card(page, sid)
    await expect(c.getByRole('heading')).toHaveText(name)
    await expect(c.getByRole('heading')).toHaveCSS('text-transform', 'uppercase')
    await expect(c.locator('header > svg')).toBeVisible()
  }
  await expect(page.getByText('Evaluation Strategy')).toHaveCount(0)
  const b = Object.fromEntries(await Promise.all(SECTION_ORDER.map(async ([sid]) => [sid, await cardBox(page, sid)])))
  const rows = [
    ['problem-space', 'evaluation-offline', 'baseline'],
    ['validation', 'data-features'],
    ['evaluation-online', 'integration', 'monitoring'],
  ]
  for (const row of rows) {
    for (const sid of row) expect(b[sid].y).toBe(b[row[0]].y)
    for (let i = 1; i < row.length; i++) expect(b[row[i]].x).toBeGreaterThan(b[row[i - 1]].x)
  }
  expect(b['validation'].y).toBeGreaterThan(b['problem-space'].y)
  expect(b['evaluation-online'].y).toBeGreaterThan(b['validation'].y)
  expect(b['target-solution'].y).toBeGreaterThan(b['evaluation-online'].y)
  const gridWidth = b['baseline'].x + b['baseline'].w - b['problem-space'].x
  expect(Math.abs(b['target-solution'].w - gridWidth)).toBeLessThanOrEqual(2)
})

test('canvas-04 first 4 key properties, +N counter, muted placeholder', async ({ page }) => {
  await openApp(page)
  const ps = card(page, 'problem-space')
  await expect(ps.getByRole('button', { name: 'Edit Domain' })).toHaveText('Not set')
  await expect(ps.getByRole('button', { name: 'Edit Domain' })).toHaveClass(/text-slate-400/)
  await expect(ps.getByText(/^\+\d+$/)).toHaveCount(0)
  await openDetails(page, 'problem-space')
  await dialog(page).getByRole('button', { name: '+ Add Property' }).click()
  await dialog(page).getByRole('textbox', { name: 'Property 5 key' }).fill('Horizon')
  await dialog(page).getByRole('button', { name: '+ Add Property' }).click()
  await dialog(page).getByRole('textbox', { name: 'Property 6 key' }).fill('Region')
  await closeEditor(page)
  await expect(ps.getByRole('button', { name: /^Edit / })).toHaveCount(4)
  await expect(ps.getByText('+2', { exact: true })).toBeVisible()
  await expect(ps.getByText('Horizon')).toHaveCount(0)
})

test('canvas-05 inline edit on card: Enter/blur save, Escape cancels, visible in editor and document', async ({ page }) => {
  await openApp(page)
  const ps = card(page, 'problem-space')
  await setCardValue(page, 'problem-space', 'Domain', 'Payments')
  await expect(ps.getByRole('button', { name: 'Edit Domain' })).toHaveText('Payments')
  await ps.getByRole('button', { name: 'Edit ML Task' }).click()
  await ps.getByRole('textbox', { name: 'ML Task' }).fill('Classification')
  await page.locator('main').click({ position: { x: 5, y: 5 } })
  await expect(ps.getByRole('button', { name: 'Edit ML Task' })).toHaveText('Classification')
  await ps.getByRole('button', { name: 'Edit Domain' }).click()
  await ps.getByRole('textbox', { name: 'Domain' }).fill('Nope')
  await ps.getByRole('textbox', { name: 'Domain' }).press('Escape')
  await expect(ps.getByRole('button', { name: 'Edit Domain' })).toHaveText('Payments')
  await openDetails(page, 'problem-space')
  await expect(dialog(page).getByRole('textbox', { name: 'Property 1 value' })).toHaveValue('Payments')
  await expect(dialog(page).getByRole('textbox', { name: 'Property 3 value' })).toHaveValue('Classification')
  await closeEditor(page)
  await toMode(page, 'Document')
  await expect(docSection(page, 'problem-space')).toContainText('Payments')
  await expect(docSection(page, 'problem-space')).toContainText('Classification')
})

test('canvas-06 thumbnail only for non-empty diagram, updates after editing', async ({ page }) => {
  await openApp(page)
  for (const [sid] of SECTION_ORDER) await expect(card(page, sid).getByTestId('thumbnail')).toHaveCount(0)
  await openDetails(page, 'validation')
  await drawRectangle(page)
  await closeEditor(page)
  const img = card(page, 'validation').getByTestId('thumbnail').locator('img')
  await expect(img).toBeVisible()
  const src1 = await img.getAttribute('src')
  expect(src1).toMatch(/^data:image\/svg\+xml/)
  expect(decodeURIComponent(src1!)).toContain('<svg')
  await openDetails(page, 'validation')
  await drawRectangle(page)
  await closeEditor(page)
  await expect.poll(() => img.getAttribute('src')).not.toBe(src1)
})

test('canvas-07 footer has only Details; non-clickable Trade-offs indicator with two states (m11-02); no Diagram indicator (m11-01)', async ({ page }) => {
  await openApp(page)
  for (const [sid] of SECTION_ORDER) {
    const c = card(page, sid)
    await expect(c.locator('footer').getByRole('button')).toHaveText(['Details'])
    const ind = indicator(c, 'Trade-offs')
    await expect(ind).toHaveAttribute('data-state', 'off')
    expect(await ind.evaluate((e) => e.tagName)).toBe('SPAN')
    await expect(indicator(c, 'Diagram')).toHaveCount(0)
  }
  const off = await indicator(card(page, 'baseline'), 'Trade-offs').evaluate((e) => getComputedStyle(e).color)
  await openDetails(page, 'baseline')
  const d = dialog(page)
  await addCriterion(d, 'Cost')
  await addOption(d, 'Rules', ['Low'])
  await addOption(d, 'LogReg', ['Low'])
  await expect(indicator(card(page, 'baseline'), 'Trade-offs')).toHaveAttribute('data-state', 'off')
  await d.getByRole('button', { name: 'Choose option 1' }).click()
  await expect(indicator(card(page, 'baseline'), 'Trade-offs')).toHaveAttribute('data-state', 'on')
  await drawRectangle(page)
  await closeEditor(page)
  await expect(card(page, 'baseline').getByTestId('thumbnail').locator('img')).toBeVisible()
  await expect(indicator(card(page, 'baseline'), 'Diagram')).toHaveCount(0)
  const on = await indicator(card(page, 'baseline'), 'Trade-offs').evaluate((e) => getComputedStyle(e).color)
  expect(on).not.toBe(off)
})

test('canvas-08 drag reorders cards, persists, keeps content', async ({ page }) => {
  await openApp(page)
  await loadExample(page)
  const before = await card(page, 'monitoring').innerText()
  const psBox = await cardBox(page, 'problem-space')
  await dragCard(page, 'monitoring', 'problem-space')
  const moved = await cardBox(page, 'monitoring')
  expect(moved.y).toBe(psBox.y)
  expect(moved.x).toBe(psBox.x)
  expect(await card(page, 'monitoring').innerText()).toBe(before)
  await reload(page)
  expect(await cardBox(page, 'monitoring')).toEqual(moved)
  expect(await card(page, 'monitoring').innerText()).toBe(before)
})

test('canvas-09 resize from corner, respects min size, persists', async ({ page }) => {
  await openApp(page)
  const start = await cardBox(page, 'baseline')
  await resizeCard(page, 'baseline', 0, 150)
  const bigger = await cardBox(page, 'baseline')
  expect(bigger.h).toBeGreaterThan(start.h)
  await reload(page)
  expect(await cardBox(page, 'baseline')).toEqual(bigger)
  await resizeCard(page, 'baseline', -1000, -1000)
  const min = await cardBox(page, 'baseline')
  expect(min.w).toBeGreaterThanOrEqual(200)
  expect(min.h).toBeGreaterThanOrEqual(150)
})

test('canvas-10 reset layout restores initial layout, content unchanged', async ({ page }) => {
  await openApp(page)
  await loadExample(page)
  const ids = SECTION_ORDER.map(([sid]) => sid)
  const initial = await Promise.all(ids.map((sid) => cardBox(page, sid)))
  const content = await Promise.all(ids.map((sid) => card(page, sid).innerText()))
  await dragCard(page, 'monitoring', 'problem-space')
  await resizeCard(page, 'integration', 0, 120)
  expect(await Promise.all(ids.map((sid) => cardBox(page, sid)))).not.toEqual(initial)
  await page.getByRole('button', { name: 'Reset layout' }).click()
  await expect.poll(() => Promise.all(ids.map((sid) => cardBox(page, sid)))).toEqual(initial)
  expect(await Promise.all(ids.map((sid) => card(page, sid).innerText()))).toEqual(content)
})

const TIP_OFF = 'Trade-offs not filled yet. Weigh the alternatives and make a considered choice.'
const TIP_ON = 'Trade-offs filled: alternatives weighed, choice made.'

test('m11-02 trade-offs status icon: top-right, not a button, two states, tooltip on hover and focus', async ({ page }) => {
  await openApp(page)
  for (const [sid] of SECTION_ORDER) {
    const c = card(page, sid)
    const ind = indicator(c, 'Trade-offs')
    await expect(c.locator('header').locator('[data-indicator="Trade-offs"]')).toHaveCount(1)
    await expect(ind).toHaveAttribute('data-state', 'off')
    await expect(ind).toHaveAccessibleName('Trade-offs not filled')
    const hb = (await c.locator('header').boundingBox())!
    const ib = (await ind.boundingBox())!
    expect(hb.x + hb.width - (ib.x + ib.width)).toBeLessThan(24)
    expect(ib.y - hb.y).toBeLessThan(hb.height / 2)
    await expect(c.getByRole('button', { name: /trade-offs/i })).toHaveCount(0)
  }
  const ind = indicator(card(page, 'baseline'), 'Trade-offs')
  await ind.click()
  await expect(dialog(page)).toHaveCount(0)
  const tip = page.getByRole('tooltip').filter({ visible: true })
  await ind.hover()
  await expect(tip).toHaveText(TIP_OFF)
  await page.mouse.move(0, 0)
  await expect(tip).toHaveCount(0)
  // Keyboard focus shows it too: Tab from the element just before the icon.
  await card(page, 'baseline').getByRole('heading').evaluate((h) => { h.tabIndex = -1; h.focus() })
  await page.keyboard.press('Tab')
  await expect(ind).toBeFocused()
  await expect(tip).toHaveText(TIP_OFF)
  await page.keyboard.press('Tab')

  await openDetails(page, 'baseline')
  const d = dialog(page)
  await addCriterion(d, 'Cost')
  await addOption(d, 'Rules', ['Low'])
  await addOption(d, 'LogReg', ['Low'])
  await d.getByRole('button', { name: 'Choose option 1' }).click()
  await closeEditor(page)
  await expect(ind).toHaveAttribute('data-state', 'on')
  await expect(ind).toHaveAccessibleName('Trade-offs filled')
  await expect(ind.locator('[data-check]')).toBeVisible()
  await ind.hover()
  await expect(tip).toHaveText(TIP_ON)
  const color = (sid: 'baseline' | 'validation') => indicator(card(page, sid), 'Trade-offs').evaluate((e) => getComputedStyle(e).color)
  expect(await color('baseline')).not.toBe(await color('validation'))
})

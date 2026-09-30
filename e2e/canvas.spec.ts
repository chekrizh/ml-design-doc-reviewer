import { expect, test } from '@playwright/test'
import {
  card, cardBox, closeEditor, contentGap, dialog, docSection, dragCard, drawRectangle, indicator, loadExample, openApp,
  openDetails, reload, resizeCard, SECTION_ORDER, setCardValue, setTitle, toMode, addCriterion, addOption, menuAction,
} from './helpers'

test('canvas-01 / m11-06 header: logo, title and save status left, toggle center, AI Review, Share and ⋯ right', async ({ page }) => {
  await openApp(page)
  const header = page.locator('header').first()
  const box = async (l: import('@playwright/test').Locator) => (await l.boundingBox())!
  const hb = await box(header)
  const title = header.getByRole('button', { name: 'Edit Design title' })
  const status = header.getByTestId('header-save-state')
  const toggle = header.getByRole('group', { name: 'Mode' })
  await expect(status).toHaveText('Saved')
  const [tb, sb, gb] = [await box(title), await box(status), await box(toggle)]
  expect(sb.x).toBeGreaterThan(tb.x + tb.width - 1)
  expect(sb.x - (tb.x + tb.width)).toBeLessThan(24)
  expect(Math.abs(gb.x + gb.width / 2 - (hb.x + hb.width / 2))).toBeLessThan(40)
  const right = ['AI Review', 'Share', 'More']
  for (const name of right) expect((await box(header.getByRole('button', { name, exact: true }))).x).toBeGreaterThan(gb.x + gb.width)
  for (const name of ['Export PDF', 'Export Markdown', 'Load example', 'Reset layout'])
    await expect(header.getByRole('button', { name })).toHaveCount(0)
  await expect(header.getByText(/contributor/i)).toHaveCount(0)
  await expect(header.locator('img')).toHaveCount(0)
})

test('m11-06 Share and ⋯ menus: items, close on outside click and Escape, Reset layout only on canvas', async ({ page }) => {
  await openApp(page)
  const share = page.getByRole('menu', { name: 'Share' })
  const more = page.getByRole('menu', { name: 'More' })
  await page.getByRole('button', { name: 'Share', exact: true }).click()
  await expect(share.getByRole('menuitem')).toHaveText(['Export PDF', 'Export Markdown'])
  await page.mouse.click(700, 500)
  await expect(share).toBeHidden()
  await page.getByRole('button', { name: 'Share', exact: true }).click()
  await expect(share).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(share).toBeHidden()

  await page.getByRole('button', { name: 'More', exact: true }).click()
  await expect(more.getByRole('menuitem')).toHaveText(['Load example', 'Reset layout'])
  await page.keyboard.press('Escape')
  await expect(more).toBeHidden()
  await toMode(page, 'Document')
  await page.getByRole('button', { name: 'More', exact: true }).click()
  await expect(more.getByRole('menuitem')).toHaveText(['Load example'])
  await page.keyboard.press('Escape')

  // Export keeps the empty-sections warning; Load example asks first.
  let message = ''
  page.once('dialog', (d) => ((message = d.message()), void d.dismiss()))
  await menuAction(page, 'Share', 'Export Markdown')
  await expect.poll(() => message).toMatch(/empty/)
  await expect(share).toBeHidden()
  page.once('dialog', (d) => ((message = d.message()), void d.dismiss()))
  await menuAction(page, 'Share', 'Export PDF')
  await expect.poll(() => message).toMatch(/empty/)
  await loadExample(page)
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
  await page.locator('header').first().click({ position: { x: 3, y: 3 } })
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

test('canvas-09 resize changes width only, respects min width, persists (m11-04)', async ({ page }) => {
  await openApp(page)
  const start = await cardBox(page, 'integration')
  await resizeCard(page, 'integration', 200, 150)
  const wider = await cardBox(page, 'integration')
  expect(wider.w).toBeGreaterThan(start.w)
  expect(wider.h).toBe(start.h)
  await reload(page)
  expect(await cardBox(page, 'integration')).toEqual(wider)
  await resizeCard(page, 'integration', -1000, 0)
  const min = await cardBox(page, 'integration')
  expect(min.w).toBeGreaterThanOrEqual(200)
  expect(min.h).toBe(start.h)
})

test('canvas-10 reset layout restores initial layout, content unchanged', async ({ page }) => {
  await openApp(page)
  await loadExample(page)
  const ids = SECTION_ORDER.map(([sid]) => sid)
  const initial = await Promise.all(ids.map((sid) => cardBox(page, sid)))
  const content = await Promise.all(ids.map((sid) => card(page, sid).innerText()))
  await dragCard(page, 'monitoring', 'problem-space')
  await resizeCard(page, 'integration', -150, 0)
  expect(await Promise.all(ids.map((sid) => cardBox(page, sid)))).not.toEqual(initial)
  await menuAction(page, 'More', 'Reset layout')
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

test('m11-03 Details is the only footer control and sits at the right edge', async ({ page }) => {
  await openApp(page)
  for (const [sid] of SECTION_ORDER) {
    const footer = card(page, sid).locator('footer')
    await expect(footer.locator('button, [role], a, input')).toHaveCount(1)
    await expect(footer.getByRole('button')).toHaveText('Details')
    const fb = (await footer.boundingBox())!
    const bb = (await footer.getByRole('button').boundingBox())!
    const rightGap = fb.x + fb.width - (bb.x + bb.width)
    expect(rightGap).toBeLessThanOrEqual(24)
    expect(bb.x - fb.x).toBeGreaterThan(rightGap)
  }
})

test('m11-04 card height follows content; resize is horizontal; cards below move', async ({ page }) => {
  await openApp(page)
  for (const [sid] of SECTION_ORDER) await expect.poll(() => contentGap(page, sid), sid).toBeLessThanOrEqual(32)
  const ps = await cardBox(page, 'problem-space')
  const v0 = await cardBox(page, 'validation')
  expect(v0.h).toBeLessThan(ps.h)
  await expect(page.locator('.react-resizable-handle')).toHaveCount(9)
  await expect(page.locator('.react-resizable-handle-e')).toHaveCount(9)
  const below0 = await cardBox(page, 'evaluation-online')

  await openDetails(page, 'validation')
  await drawRectangle(page)
  await closeEditor(page)
  await expect(card(page, 'validation').getByTestId('thumbnail').locator('img')).toBeVisible()
  const v1 = await cardBox(page, 'validation')
  expect(v1.h).toBeGreaterThan(v0.h)
  expect((await cardBox(page, 'evaluation-online')).y).toBeGreaterThan(below0.y)
  for (const [sid] of SECTION_ORDER) await expect.poll(() => contentGap(page, sid), sid).toBeLessThanOrEqual(32)

  // Content shrinks: the card follows back.
  await openDetails(page, 'validation')
  await dialog(page).getByTestId('whiteboard').locator('canvas.interactive').click()
  await page.keyboard.press('ControlOrMeta+A')
  await page.keyboard.press('Delete')
  await closeEditor(page)
  await expect(card(page, 'validation').getByTestId('thumbnail')).toHaveCount(0)
  await expect.poll(() => cardBox(page, 'validation')).toEqual(v0)
  expect(await cardBox(page, 'evaluation-online')).toEqual(below0)

  await resizeCard(page, 'problem-space', 150, 200)
  const wider = await cardBox(page, 'problem-space')
  expect(wider.w).toBeGreaterThan(ps.w)
  expect(wider.h).toBe(ps.h)
  await expect.poll(() => contentGap(page, 'problem-space')).toBeLessThanOrEqual(32)
})

test('m11-07 AI Review popover: one disabled Full review item with a Coming soon tooltip', async ({ page }) => {
  await openApp(page)
  await page.getByRole('button', { name: 'AI Review', exact: true }).click()
  const menu = page.getByRole('menu', { name: 'AI Review' })
  await expect(menu).toBeVisible()
  await expect(menu.getByRole('menuitem')).toHaveText(['Full review'])
  const item = menu.getByRole('menuitem', { name: 'Full review' })
  await expect(item).toBeDisabled()
  const tip = page.getByRole('tooltip', { name: 'Coming soon' })
  await expect(tip).toBeHidden()
  await item.hover()
  await expect(tip).toBeVisible()
  await expect(item).toHaveAccessibleDescription('Coming soon')
  await item.click({ force: true })
  await expect(dialog(page)).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(menu).toBeHidden()
})

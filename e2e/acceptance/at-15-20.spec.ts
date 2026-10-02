import { expect, test, type Page } from '@playwright/test'
import {
  addCriterion, addOption, card, cardBox, closeEditor, dialog, docSection, downloadText, drawRectangle,
  exportMarkdown, indicator, loadExample, openApp, openDetails, reload, resizeCard, SECTION_ORDER, setCardValue,
  toMode,
  expectRowsFitContent,
} from '../helpers'

const TIP_OFF = 'Trade-offs not filled yet. Weigh the alternatives and make a considered choice.'
const TIP_ON = 'Trade-offs filled: alternatives weighed, choice made.'
const visibleTooltip = (page: Page) => page.getByRole('tooltip').filter({ visible: true })

test('AT-15 trade-offs indicator and Details button', async ({ page }) => {
  await openApp(page)
  const c = card(page, 'evaluation-offline')
  const ind = indicator(c, 'Trade-offs')
  // 1. Grey scales in the top-right corner; not a button, clicking opens nothing.
  const hb = (await c.locator('header').boundingBox())!
  const ib = (await ind.boundingBox())!
  expect(hb.x + hb.width - (ib.x + ib.width)).toBeLessThan(24)
  expect(ib.y - hb.y).toBeLessThan(hb.height / 2)
  await expect(ind).toHaveAttribute('data-state', 'off')
  await expect(ind.locator('[data-check]')).toHaveCount(0)
  const grey = await ind.evaluate((e) => getComputedStyle(e).color)
  expect(await ind.evaluate((e) => e.tagName)).not.toBe('BUTTON')
  await expect(c.getByRole('button', { name: /trade-offs/i })).toHaveCount(0)
  await ind.click()
  await expect(dialog(page)).toHaveCount(0)
  await expect(page.getByRole('menu').filter({ visible: true })).toHaveCount(0)
  await page.mouse.move(0, 0)
  // 2. Hover shows the "not filled" tooltip.
  await ind.hover()
  await expect(visibleTooltip(page)).toHaveText(TIP_OFF)
  // 3. Strict rule met: green with a check mark, "filled" tooltip.
  await openDetails(page, 'evaluation-offline')
  const d = dialog(page)
  await addCriterion(d, 'Recall')
  await addOption(d, 'PR-AUC', ['High'])
  await addOption(d, 'ROC-AUC', ['Medium'])
  await d.getByRole('button', { name: 'Choose option 1' }).click()
  await closeEditor(page)
  await expect(ind).toHaveAttribute('data-state', 'on')
  await expect(ind.locator('[data-check]')).toBeVisible()
  const green = await ind.evaluate((e) => getComputedStyle(e).color)
  expect(green).not.toBe(grey)
  // Computed colours may be oklch(); read them back as RGB through a canvas pixel.
  const [r, g, b] = await ind.evaluate((e) => {
    const ctx = document.createElement('canvas').getContext('2d')!
    ctx.fillStyle = getComputedStyle(e).color
    ctx.fillRect(0, 0, 1, 1)
    return [...ctx.getImageData(0, 0, 1, 1).data]
  })
  expect(g).toBeGreaterThan(r)
  expect(g).toBeGreaterThan(b)
  await ind.hover()
  await expect(visibleTooltip(page)).toHaveText(TIP_ON)
  // 4. No Diagram indicator on any card.
  for (const [sid] of SECTION_ORDER) await expect(indicator(card(page, sid), 'Diagram')).toHaveCount(0)
  await expect(page.locator('article footer').getByText('Diagram')).toHaveCount(0)
  // 5. Details at the right edge of the footer.
  for (const [sid] of SECTION_ORDER) {
    const footer = card(page, sid).locator('footer')
    const fb = (await footer.boundingBox())!
    const bb = (await footer.getByRole('button', { name: 'Details' }).boundingBox())!
    const rightGap = fb.x + fb.width - (bb.x + bb.width)
    expect(rightGap).toBeLessThanOrEqual(24)
    expect(bb.x - fb.x).toBeGreaterThan(rightGap)
  }
})

test('AT-16 free text in the document', async ({ page }) => {
  await openApp(page)
  await toMode(page, 'Document')
  const m = docSection(page, 'monitoring')
  await m.getByText('Not filled yet — start typing…').click()
  await page.keyboard.type('Watch PSI weekly')
  await toMode(page, 'Canvas')
  await openDetails(page, 'monitoring')
  await expect(dialog(page).getByRole('textbox', { name: 'Rationale' })).toHaveText('Watch PSI weekly')
  await closeEditor(page)
  const { warning, download } = await exportMarkdown(page, 'accept')
  expect(warning).toMatch(/\b8\b/)
  const md = await downloadText(download!)
  const at = md.search(/^## .*Monitoring/m)
  expect(at).toBeGreaterThanOrEqual(0)
  const section = md.slice(at).split(/\n## /)[0]
  expect(section).toContain('Watch PSI weekly')
})

test('AT-17 document heading is the design title', async ({ page }) => {
  await openApp(page)
  await toMode(page, 'Document')
  const h1 = page.getByTestId('document').getByRole('heading', { level: 1 })
  await h1.click()
  await h1.getByRole('textbox').fill('Ads CTR')
  await h1.getByRole('textbox').press('Enter')
  const check = async () => {
    await expect(page.getByRole('button', { name: 'Edit Design title' })).toHaveText('Ads CTR')
    await expect(h1).toHaveText('Ads CTR')
  }
  await check()
  await reload(page)
  await toMode(page, 'Document')
  await check()
})

test('AT-18 header: Share, AI Review, ⋯ menu, save status', async ({ page }) => {
  await openApp(page)
  const header = page.locator('header').first()
  // 1. No separate export / example / layout buttons.
  for (const name of ['Export PDF', 'Export Markdown', 'Load example', 'Reset layout'])
    await expect(header.getByRole('button', { name })).toHaveCount(0)
  // 2. "Saved" next to the title.
  const status = header.getByTestId('header-save-state')
  await expect(status).toHaveText('Saved')
  const tb = (await header.getByRole('button', { name: 'Edit Design title' }).boundingBox())!
  const sb = (await status.boundingBox())!
  expect(sb.x).toBeGreaterThanOrEqual(tb.x + tb.width - 1)
  expect(sb.x - (tb.x + tb.width)).toBeLessThan(24)
  expect(Math.abs(sb.y + sb.height / 2 - (tb.y + tb.height / 2))).toBeLessThan(12)
  // 3. Share menu; Export Markdown from it downloads a .md after one value in Problem Space.
  await header.getByRole('button', { name: 'Share', exact: true }).click()
  // Point 3 follows AT-43 in M2 ('Что из M1 заменено'): PDF and Markdown keep their order in Share.
  const items = await page.getByRole('menu', { name: 'Share' }).getByRole('menuitem').allInnerTexts()
  expect(items.filter((t) => t === 'Export PDF' || t === 'Export Markdown')).toEqual(['Export PDF', 'Export Markdown'])
  await page.keyboard.press('Escape')
  await setCardValue(page, 'problem-space', 'Domain', 'Payments')
  const { warning, download } = await exportMarkdown(page, 'accept')
  expect(warning).toMatch(/empty/)
  expect(download!.suggestedFilename()).toMatch(/\.md$/)
  // 4. Follows AT-30 in M2: a guest's AI Review asks to sign in; no 'Coming soon'.
  await header.getByRole('button', { name: 'AI Review', exact: true }).click()
  const ai = page.getByRole('menu', { name: 'AI Review' })
  await expect(ai).toContainText('Sign in to run AI review')
  await expect(ai).not.toContainText('Coming soon')
  await page.keyboard.press('Escape')
  // 5. "⋯" has Load example and Reset layout; Load example loads after confirmation.
  await header.getByRole('button', { name: 'More', exact: true }).click()
  await expect(header.getByRole('button', { name: 'More', exact: true })).toHaveText('⋯')
  await expect(page.getByRole('menu', { name: 'More' }).getByRole('menuitem')).toHaveText(['Load example', 'Reset layout', 'Clear design'])
  await page.keyboard.press('Escape')
  await loadExample(page)
})

test('AT-19 card height follows content', async ({ page }) => {
  await openApp(page)
  const gapsOk = () => expectRowsFitContent(page)
  // 1.
  await gapsOk()
  // 2. Content changes.
  await openDetails(page, 'evaluation-offline')
  await drawRectangle(page)
  await closeEditor(page)
  await expect(card(page, 'evaluation-offline').getByTestId('thumbnail').getByRole('img')).toBeVisible()
  await gapsOk()
  // 3. Width changes.
  const ps = await cardBox(page, 'problem-space')
  await resizeCard(page, 'problem-space', 150, 120)
  expect((await cardBox(page, 'problem-space')).w).not.toBe(ps.w)
  await gapsOk()
})

test('AT-20 full-width layout (Chromium and WebKit)', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await openApp(page)
  const area = await page.locator('.react-grid-layout').evaluate((e) => {
    const r = e.getBoundingClientRect()
    return { left: r.left + scrollX, right: r.right + scrollX }
  })
  const b = Object.fromEntries(await Promise.all(SECTION_ORDER.map(async ([sid]) => [sid, await cardBox(page, sid)])))
  expect(Math.abs(b['problem-space'].x - area.left)).toBeLessThanOrEqual(2)
  expect(Math.abs(b['baseline'].x + b['baseline'].w - area.right)).toBeLessThanOrEqual(2)
  const gaps = (ids: string[]) => ids.slice(1).map((id, k) => b[id].x - (b[ids[k]].x + b[ids[k]].w))
  const row2 = Math.max(...gaps(['validation', 'data-features']))
  for (const g of gaps(['problem-space', 'evaluation-offline', 'baseline'])) expect(g).toBeLessThanOrEqual(row2 + 2)
})

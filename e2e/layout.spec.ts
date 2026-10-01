import { expect, test } from '@playwright/test'
import { cardBox, openApp, SECTION_ORDER } from './helpers'

// m11-05: the canvas fills the card area edge to edge in every engine (Safari showed side gaps).
test('m11-05 cards span the full width of the card area, rows without extra gaps', async ({ page }) => {
  await openApp(page)
  const area = await page.locator('.react-grid-layout').evaluate((e) => {
    const b = e.getBoundingClientRect()
    return { left: b.left, right: b.right }
  })
  const b = Object.fromEntries(await Promise.all(SECTION_ORDER.map(async ([sid]) => [sid, await cardBox(page, sid)])))
  expect(Math.abs(b['problem-space'].x - area.left)).toBeLessThanOrEqual(2)
  expect(Math.abs(b['baseline'].x + b['baseline'].w - area.right)).toBeLessThanOrEqual(2)
  expect(Math.abs(b['target-solution'].x + b['target-solution'].w - area.right)).toBeLessThanOrEqual(2)
  const gaps = (ids: string[]) => ids.slice(1).map((id, k) => b[id].x - (b[ids[k]].x + b[ids[k]].w))
  const row1 = gaps(['problem-space', 'evaluation-offline', 'baseline'])
  const row2 = gaps(['validation', 'data-features'])
  for (const g of row1) expect(g).toBeLessThanOrEqual(Math.max(...row2) + 2)
})

// Root cause of the Safari side gaps: the canvas was capped at 1600px, so on wider windows
// (a 1728px MacBook display) the cards sat in the middle with empty sides under a full-width header.
for (const width of [1440, 1728, 1920])
  test(`m11-05 at ${width}px the cards reach both sides of the window (16px gutter)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 })
    await openApp(page)
    const vw = await page.evaluate(() => document.documentElement.clientWidth)
    const ps = await cardBox(page, 'problem-space')
    const bl = await cardBox(page, 'baseline')
    expect(Math.abs(ps.x - 16)).toBeLessThanOrEqual(2)
    expect(Math.abs(bl.x + bl.w - (vw - 16))).toBeLessThanOrEqual(2)
  })

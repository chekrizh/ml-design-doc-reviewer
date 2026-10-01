import { expect, test } from '@playwright/test'
import {
  answerDialog, addCriterion, addOption, card, cardBox, closeEditor, dialog, docSection, downloadText, dragCard, drawRectangle,
  exportMarkdown, indicator, loadExample, openApp, openDetails, pdfText, readZip, reload, resizeCard, SECTION_ORDER,
  setCardValue, setTitle, toMode, menuAction,
} from '../helpers'

const ids = SECTION_ORDER.map(([sid]) => sid)

test('AT-09 everything survives a reload', async ({ page }) => {
  await openApp(page)
  await setTitle(page, 'Reload Me')
  await setCardValue(page, 'problem-space', 'Domain', 'Payments')
  await openDetails(page, 'baseline')
  const d = dialog(page)
  await d.getByRole('textbox', { name: 'Rationale' }).fill('Kept after reload')
  await addCriterion(d, 'Cost')
  await addOption(d, 'Rules', ['Low'])
  await addOption(d, 'GBM', ['High'])
  await d.getByRole('button', { name: 'Choose option 2' }).click()
  await drawRectangle(page)
  await closeEditor(page)
  await dragCard(page, 'monitoring', 'problem-space')
  const before = await cardBox(page, 'integration')
  // Card height follows content (M1.1), so the size the user changes is the width.
  await resizeCard(page, 'integration', 150, 0)
  expect((await cardBox(page, 'integration')).w).toBeGreaterThan(before.w)
  const boxes = await Promise.all(ids.map((sid) => cardBox(page, sid)))

  await reload(page)

  await expect(page.getByRole('button', { name: 'Edit Design title' })).toHaveText('Reload Me')
  await expect(card(page, 'problem-space').getByRole('button', { name: 'Edit Domain' })).toHaveText('Payments')
  await expect(card(page, 'baseline').getByTestId('thumbnail').getByRole('img')).toBeVisible()
  await expect(indicator(card(page, 'baseline'), 'Trade-offs')).toHaveAttribute('data-state', 'on')
  expect(await Promise.all(ids.map((sid) => cardBox(page, sid)))).toEqual(boxes)
  await openDetails(page, 'baseline')
  await expect(d.getByRole('textbox', { name: 'Rationale' })).toHaveText('Kept after reload')
  await expect(d.getByRole('textbox', { name: 'Criterion 1 name' })).toHaveValue('Cost')
  await expect(d.getByRole('textbox', { name: 'Option 1 name' })).toHaveValue('Rules')
  await expect(d.getByRole('textbox', { name: 'Option 2 name' })).toHaveValue('GBM')
  await expect(d.getByRole('textbox', { name: 'Cell 1,1' })).toHaveValue('Low')
  await expect(d.getByRole('textbox', { name: 'Cell 2,1' })).toHaveValue('High')
  await expect(d.getByRole('button', { name: 'Choose option 2' })).toHaveAttribute('aria-pressed', 'true')
  await expect(d.getByRole('button', { name: 'Choose option 1' })).toHaveAttribute('aria-pressed', 'false')
})

test('AT-10 reset layout', async ({ page }) => {
  await openApp(page)
  await loadExample(page)
  const initial = await Promise.all(ids.map((sid) => cardBox(page, sid)))
  const content = await Promise.all(ids.map((sid) => card(page, sid).innerText()))
  await dragCard(page, 'monitoring', 'problem-space')
  await dragCard(page, 'baseline', 'validation')
  await resizeCard(page, 'integration', -150, 0)
  expect(await Promise.all(ids.map((sid) => cardBox(page, sid)))).not.toEqual(initial)
  await menuAction(page, 'More', 'Reset layout')
  await expect.poll(() => Promise.all(ids.map((sid) => cardBox(page, sid)))).toEqual(initial)
  expect(await Promise.all(ids.map((sid) => card(page, sid).innerText()))).toEqual(content)
})

test('AT-11 load example asks first', async ({ page }) => {
  await openApp(page)
  await setTitle(page, 'Mine')
  await menuAction(page, 'More', 'Load example')
  await answerDialog(page, 'Cancel')
  await expect(page.getByRole('button', { name: 'Edit Design title' })).toHaveText('Mine')

  await loadExample(page)
  await expect(page.getByRole('button', { name: 'Edit Design title' })).toHaveText('Churn Prediction (Telecom)')
  for (const sid of ids) {
    const values = await card(page, sid).getByRole('button', { name: /^Edit / }).allInnerTexts()
    expect(values.length, sid).toBeGreaterThan(0)
    for (const v of values) expect(v, sid).not.toBe('Not set')
  }
  expect(await page.locator('[data-indicator="Trade-offs"][data-state="on"]').count()).toBeGreaterThanOrEqual(3)
  await expect.poll(() => page.locator('[data-testid="thumbnail"] img').count()).toBeGreaterThanOrEqual(2)
})

test('AT-12 Markdown export is a file or a ZIP', async ({ page }) => {
  // 1. Empty design, one value, no diagrams -> a single .md.
  await openApp(page)
  await setCardValue(page, 'problem-space', 'Domain', 'Payments')
  const one = await exportMarkdown(page, 'accept')
  expect(one.download!.suggestedFilename()).toMatch(/\.md$/)
  expect(await downloadText(one.download!)).toContain('Payments')

  // 2. Example with diagrams -> .zip with one .md and images/*.svg.
  await loadExample(page)
  const withDiagrams = await page.getByTestId('thumbnail').count()
  const two = await exportMarkdown(page, 'none')
  expect(two.download!.suggestedFilename()).toMatch(/\.zip$/)
  const zip = await readZip(two.download!)
  const files = Object.keys(zip.files).filter((f) => !zip.files[f].dir)
  const mds = files.filter((f) => f.endsWith('.md'))
  const svgs = files.filter((f) => f.endsWith('.svg'))
  expect(mds).toHaveLength(1)
  expect(svgs.length).toBeGreaterThan(0)
  for (const s of svgs) expect(s).toMatch(/^images\/[^/]+\.svg$/)
  expect(files).toHaveLength(mds.length + svgs.length)
  const md = await zip.file(mds[0])!.async('string')
  const links = [...md.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map((m) => m[1])
  expect(links.length).toBeGreaterThan(0)
  for (const l of links) expect(files).toContain(l)
  expect(svgs).toHaveLength(withDiagrams)
})

test('AT-13 empty sections', async ({ page }) => {
  await openApp(page)
  await setCardValue(page, 'problem-space', 'Domain', 'Payments')
  await setCardValue(page, 'baseline', 'Approach', 'Rules')
  // 1. The other seven show the placeholder.
  await toMode(page, 'Document')
  for (const [sid] of SECTION_ORDER) {
    const placeholder = docSection(page, sid).getByText('Not filled yet')
    if (sid === 'problem-space' || sid === 'baseline') await expect(placeholder).toHaveCount(0)
    else await expect(placeholder).toBeVisible()
  }
  // 2. Warning names 7; cancel downloads nothing.
  const cancelled = await exportMarkdown(page, 'dismiss')
  expect(cancelled.warning).toMatch(/\b7\b/)
  expect(cancelled.downloads).toBe(0)
  // 3. Confirm: only the two filled sections are in the file.
  const { download } = await exportMarkdown(page, 'accept')
  const md = await downloadText(download!)
  const headings = md.split('\n').filter((l) => l.startsWith('## '))
  expect(headings.some((h) => h.includes('Problem Space'))).toBe(true)
  expect(headings.some((h) => h.includes('Baseline'))).toBe(true)
  for (const [sid, name] of SECTION_ORDER) {
    if (sid === 'problem-space' || sid === 'baseline') continue
    expect(headings.some((h) => h.includes(name))).toBe(false)
  }
  expect(headings).toHaveLength(2)
})

test('AT-14 PDF has the filled headings and none of the app chrome', async ({ page, browserName }) => {
  await openApp(page)
  await loadExample(page)
  await toMode(page, 'Document')
  await expect(docSection(page, 'validation').getByRole('img')).toBeVisible()
  await page.emulateMedia({ media: 'print' })
  // page.pdf() exists only in Chromium. In WebKit the same checks run on the text the print
  // rendering shows (see open-questions.md, AT-14 in WebKit).
  const text = browserName === 'chromium' ? await pdfText(page) : await page.locator('body').innerText()
  for (const [, name] of SECTION_ORDER) expect(text).toContain(name)
  for (const chrome of ['Canvas', 'Document', 'Share', 'AI Review', 'Export PDF', 'Export Markdown', 'Load example', 'Reset layout', 'On this page'])
    expect(text).not.toContain(chrome)
})

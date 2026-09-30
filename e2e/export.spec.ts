import { expect, test } from '@playwright/test'
import { designToMarkdown } from '../src/export/markdown'
import { diagramNonEmpty, sectionEmpty } from '../src/model/rules'
import { exampleDesign } from '../src/fixtures/example'
import {
  closeEditor, downloadText, drawRectangle, exportMarkdown, loadExample, openApp, openDetails, pdfText, readZip,
  SECTION_ORDER, savedDesign, setCardValue, setTitle, toMode, menuAction,
} from './helpers'

test('export-02 without diagrams: single <title-slug>.md equal to the generator output', async ({ page }) => {
  await openApp(page)
  await setTitle(page, 'Fraud Detection')
  await setCardValue(page, 'problem-space', 'Domain', 'Payments')
  const design = await savedDesign(page)
  const { download } = await exportMarkdown(page)
  expect(download!.suggestedFilename()).toBe('fraud-detection.md')
  expect(await downloadText(download!)).toBe(designToMarkdown(design))
})

test('export-03 with diagrams: <title-slug>.zip with the .md and one svg per diagram, all links resolve', async ({ page }) => {
  await openApp(page)
  await loadExample(page)
  const design = await savedDesign(page)
  const { download } = await exportMarkdown(page, 'none')
  expect(download!.suggestedFilename()).toBe('churn-prediction-telecom.zip')
  const zip = await readZip(download!)
  const files = Object.keys(zip.files).filter((f) => !zip.files[f].dir)
  const svgs = files.filter((f) => /^images\/.+\.svg$/.test(f))
  expect(files.sort()).toEqual(['churn-prediction-telecom.md', ...svgs].sort())
  expect(svgs).toHaveLength(design.sections.filter((s) => diagramNonEmpty(s.diagram)).length)
  const md = await zip.file('churn-prediction-telecom.md')!.async('string')
  expect(md).toBe(designToMarkdown(design))
  const links = [...md.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map((m) => m[1])
  expect(links.length).toBe(svgs.length)
  for (const l of links) expect(files).toContain(l)
  for (const s of svgs) expect(await zip.file(s)!.async('string')).toContain('<svg')
})

test('export-04 Export PDF opens print for the document; print styles hide chrome; PDF has every filled heading', async ({ page }) => {
  await page.addInitScript(() => {
    window.print = () => {
      ;(window as unknown as { printed: number }).printed = ((window as unknown as { printed?: number }).printed ?? 0) + 1
    }
  })
  await openApp(page)
  await loadExample(page)
  await menuAction(page, 'Share', 'Export PDF')
  await expect.poll(() => page.evaluate(() => (window as unknown as { printed?: number }).printed)).toBe(1)
  await expect(page.getByTestId('document')).toBeVisible()

  await page.emulateMedia({ media: 'print' })
  await expect(page.locator('header').first()).toBeHidden()
  await expect(page.getByRole('navigation', { name: 'On this page' })).toBeHidden()
  await expect(page.getByTestId('document')).toBeVisible()

  const text = await pdfText(page)
  exampleDesign().sections.forEach((s, i) => {
    if (!sectionEmpty(s)) expect(text).toContain(`${i + 1}. ${SECTION_ORDER[i][1]}`)
  })
  expect(text).not.toContain('On this page')
  expect(text).not.toContain('Export Markdown')
})

test('export-05 warning with the number of empty sections before both exports; cancel or continue', async ({ page }) => {
  await page.addInitScript(() => {
    window.print = () => {
      ;(window as unknown as { printed: number }).printed = ((window as unknown as { printed?: number }).printed ?? 0) + 1
    }
  })
  await openApp(page)
  await setCardValue(page, 'problem-space', 'Domain', 'Payments')
  // Markdown: cancel, then continue.
  const cancelled = await exportMarkdown(page, 'dismiss')
  expect(cancelled.warning).toContain('8')
  expect(cancelled.downloads).toBe(0)
  const accepted = await exportMarkdown(page, 'accept')
  expect(accepted.warning).toContain('8')
  expect(accepted.download).not.toBeNull()
  // PDF: cancel, then continue.
  let msg = ''
  page.once('dialog', (d) => ((msg = d.message()), void d.dismiss()))
  await menuAction(page, 'Share', 'Export PDF')
  expect(msg).toContain('8')
  await page.waitForTimeout(500)
  expect(await page.evaluate(() => (window as unknown as { printed?: number }).printed)).toBeUndefined()
  page.once('dialog', (d) => void d.accept())
  await toMode(page, 'Canvas')
  await menuAction(page, 'Share', 'Export PDF')
  await expect.poll(() => page.evaluate(() => (window as unknown as { printed?: number }).printed)).toBe(1)
})

test('export-05 no warning when no section is empty', async ({ page }) => {
  await page.addInitScript(() => {
    window.print = () => {
      ;(window as unknown as { printed: number }).printed = 1
    }
  })
  await openApp(page)
  await loadExample(page)
  let dialogs = 0
  page.on('dialog', (d) => (dialogs++, void d.dismiss()))
  const { warning, download } = await exportMarkdown(page, 'none')
  expect(warning).toBeNull()
  expect(download).not.toBeNull()
  await menuAction(page, 'Share', 'Export PDF')
  await expect.poll(() => page.evaluate(() => (window as unknown as { printed?: number }).printed)).toBe(1)
  expect(dialogs).toBe(0)
})

test('export-03 drawing a diagram switches Markdown export from .md to .zip', async ({ page }) => {
  await openApp(page)
  await setTitle(page, 'Mine')
  await openDetails(page, 'validation')
  await drawRectangle(page)
  await closeEditor(page)
  const { download } = await exportMarkdown(page)
  expect(download!.suggestedFilename()).toBe('mine.zip')
  const zip = await readZip(download!)
  expect(Object.keys(zip.files).filter((f) => !zip.files[f].dir).sort()).toEqual(['images/validation.svg', 'mine.md'])
})

import { expect, type Locator, type Page } from '@playwright/test'
import type { SectionId } from '../src/model/design'

export const SECTION_ORDER: [SectionId, string][] = [
  ['problem-space', 'Problem Space'],
  ['evaluation-offline', 'Evaluation (Offline)'],
  ['baseline', 'Baseline'],
  ['validation', 'Validation'],
  ['data-features', 'Data & Features'],
  ['evaluation-online', 'Evaluation (Online)'],
  ['integration', 'Integration'],
  ['monitoring', 'Monitoring'],
  ['target-solution', 'Target Solution & Architecture'],
]

export async function openApp(page: Page) {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Canvas', exact: true })).toBeVisible()
}

export const card = (page: Page, sid: SectionId) => page.getByTestId(`card-${sid}`)
export const docSection = (page: Page, sid: SectionId) => page.getByTestId(`doc-section-${sid}`)
export const indicator = (c: Locator, name: 'Trade-offs' | 'Diagram') => c.locator(`[data-indicator="${name}"]`)
export const dialog = (page: Page) => page.getByRole('dialog')

/** Waits until autosave has written the latest change. */
export async function waitSaved(page: Page) {
  await expect(page.getByTestId('header-save-state')).toHaveText('Saved')
}

export async function reload(page: Page) {
  await waitSaved(page)
  await page.reload()
  await expect(page.getByRole('button', { name: 'Canvas', exact: true })).toBeVisible()
}

export async function setCardValue(page: Page, sid: SectionId, key: string, value: string) {
  await card(page, sid).getByRole('button', { name: `Edit ${key}` }).click()
  const input = card(page, sid).getByRole('textbox', { name: key })
  await input.fill(value)
  await input.press('Enter')
}

export async function setTitle(page: Page, title: string) {
  await page.getByRole('button', { name: 'Edit Design title' }).click()
  await page.getByRole('textbox', { name: 'Design title' }).fill(title)
  await page.getByRole('textbox', { name: 'Design title' }).press('Enter')
}

export async function loadExample(page: Page) {
  page.once('dialog', (d) => d.accept())
  await page.getByRole('button', { name: 'Load example' }).click()
  await expect(page.getByRole('button', { name: 'Edit Design title' })).toHaveText('Churn Prediction (Telecom)')
}

export async function openDetails(page: Page, sid: SectionId) {
  await card(page, sid).getByRole('button', { name: 'Details' }).click()
  await expect(dialog(page)).toBeVisible()
}

export async function closeEditor(page: Page) {
  await dialog(page).getByRole('button', { name: 'Close' }).click()
  await expect(dialog(page)).toBeHidden()
}

export async function toMode(page: Page, mode: 'Canvas' | 'Document') {
  await page.getByRole('button', { name: mode, exact: true }).click()
}

/** Adds an option row and fills name + cells. */
export async function addOption(scope: Locator, name: string, cells: string[]) {
  await scope.getByRole('button', { name: 'Add Option (Row)' }).click()
  const n = await scope.getByRole('textbox', { name: /^Option \d+ name$/ }).count()
  await scope.getByRole('textbox', { name: `Option ${n} name` }).fill(name)
  for (const [j, c] of cells.entries()) await scope.getByRole('textbox', { name: `Cell ${n},${j + 1}` }).fill(c)
}

export async function addCriterion(scope: Locator, name: string) {
  await scope.getByRole('button', { name: 'Add Criteria (Col)' }).click()
  const n = await scope.getByRole('textbox', { name: /^Criterion \d+ name$/ }).count()
  await scope.getByRole('textbox', { name: `Criterion ${n} name` }).fill(name)
}

/** Draws a rectangle on the whiteboard of the open Component Editor. */
export async function drawRectangle(page: Page) {
  const board = dialog(page).getByTestId('whiteboard')
  await board.scrollIntoViewIfNeeded()
  await board.getByTitle(/^Rectangle/).click()
  const box = (await board.locator('canvas.interactive').boundingBox())!
  const x = box.x + box.width / 2 - 60
  const y = box.y + box.height / 2 - 40
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + 120, y + 80, { steps: 5 })
  await page.mouse.up()
}

/** Grid position and size of a card, in page pixels, once its CSS transition has settled. */
export async function cardBox(page: Page, sid: SectionId) {
  // Page coordinates, so scrolling does not change the result.
  const read = () =>
    page.locator(`[data-grid-item="${sid}"]`).evaluate((e) => {
      const b = e.getBoundingClientRect()
      return { x: Math.round(b.x + scrollX), y: Math.round(b.y + scrollY), w: Math.round(b.width), h: Math.round(b.height) }
    })
  let prev = await read()
  for (;;) {
    await page.waitForTimeout(100)
    const next = await read()
    if (JSON.stringify(next) === JSON.stringify(prev)) return next
    prev = next
  }
}

/** Drags a card by its header onto the position of another card. */
export async function dragCard(page: Page, from: SectionId, to: SectionId) {
  const src = (await card(page, from).locator('header').boundingBox())!
  const dst = (await card(page, to).locator('header').boundingBox())!
  await page.mouse.move(src.x + 40, src.y + src.height / 2)
  await page.mouse.down()
  await page.mouse.move(dst.x + 40, dst.y + dst.height / 2, { steps: 20 })
  await page.mouse.up()
}

export async function resizeCard(page: Page, sid: SectionId, dx: number, dy: number) {
  const handle = page.locator(`[data-grid-item="${sid}"] .react-resizable-handle`)
  await handle.scrollIntoViewIfNeeded()
  const b = (await handle.boundingBox())!
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
  await page.mouse.down()
  await page.mouse.move(b.x + b.width / 2 + dx, b.y + b.height / 2 + dy, { steps: 10 })
  await page.mouse.up()
}

/** Clicks Export Markdown, handles the empty-sections warning, returns the download. */
export async function exportMarkdown(page: Page, onWarning: 'accept' | 'dismiss' | 'none' = 'accept') {
  let warning: string | null = null
  const handler = (d: import('@playwright/test').Dialog) => {
    warning = d.message()
    void (onWarning === 'dismiss' ? d.dismiss() : d.accept())
  }
  page.once('dialog', handler)
  if (onWarning === 'dismiss') {
    const downloads: unknown[] = []
    page.on('download', (d) => downloads.push(d))
    await page.getByRole('button', { name: 'Export Markdown' }).click()
    await page.waitForTimeout(1000)
    return { warning: warning as string | null, download: null, downloads: downloads.length }
  }
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export Markdown' }).click()])
  page.off('dialog', handler)
  return { warning: warning as string | null, download, downloads: 1 }
}

export async function downloadText(download: import('@playwright/test').Download) {
  const { readFile } = await import('node:fs/promises')
  return readFile((await download.path())!, 'utf8')
}

export async function readZip(download: import('@playwright/test').Download) {
  const { readFile } = await import('node:fs/promises')
  const JSZip = (await import('jszip')).default
  return JSZip.loadAsync(await readFile((await download.path())!))
}

/** Text of a PDF printed from the page (print media). */
export async function pdfText(page: Page) {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const data = new Uint8Array(await page.pdf({ printBackground: true }))
  const pdf = await getDocument({ data }).promise
  let text = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const content = await (await pdf.getPage(i)).getTextContent()
    text += content.items.map((it) => ('str' in it ? it.str : '')).join(' ') + '\n'
  }
  return text
}

/** The saved design, read from IndexedDB. */
export async function savedDesign(page: Page) {
  await waitSaved(page)
  return page.evaluate(
    () =>
      new Promise<import('../src/model/design').Design>((resolve) => {
        const req = indexedDB.open('ml-design-trainer')
        req.onsuccess = () => {
          const get = req.result.transaction('designs').objectStore('designs').get('current')
          get.onsuccess = () => resolve(get.result)
        }
      }),
  )
}

/** Pixels between the bottom of a card's last content element and the top of its footer. */
export async function contentGap(page: Page, sid: SectionId) {
  return card(page, sid).evaluate((a) => {
    const footer = a.querySelector('footer')!.getBoundingClientRect().top
    const body = a.querySelector('header')!.nextElementSibling!
    const bottoms = [...body.querySelectorAll('dt, dd, [data-testid="thumbnail"]')].map((e) => e.getBoundingClientRect().bottom)
    const last = bottoms.length ? Math.max(...bottoms) : body.getBoundingClientRect().top
    return footer - last
  })
}

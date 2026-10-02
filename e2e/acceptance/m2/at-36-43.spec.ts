import { dialog, docSection, exportMarkdown, loadExample, openDetails, pdfText, readZip, SECTION_ORDER, setCardValue, toMode } from '../../helpers'
import { stubGoogle } from '../../mocks/google/google'
import { mockOpenRouter } from '../../mocks/openrouter/server'
import { expect, openExampleWithKey, reviewPanel, runReview, test } from '../../m2/fixtures'
import { afterAT32, badge, expand, expectCounts, finding } from './setup'

const R1_TITLES = [
  'Average check does not measure the stated goal',
  'Split by distribution center leaves too few units to detect +0.3%',
  'Control metrics have no thresholds',
  'Out-of-stock is called costlier than overstock, but neither cost is estimated',
  'Antigoals are not stated',
]

test('AT-36 document: outline and comments', async ({ page }) => {
  // 1. An empty design: the outline is left of the sheet.
  await page.goto('/local')
  await toMode(page, 'Document')
  const outline = (await page.getByRole('navigation', { name: 'On this page' }).boundingBox())!
  expect(outline.x + outline.width).toBeLessThanOrEqual((await page.getByTestId('document').boundingBox())!.x)
  // 2. After AT-32: comments right of the sheet, none overlapping another.
  await afterAT32(page)
  await toMode(page, 'Document')
  const sheet = (await page.getByTestId('document').boundingBox())!
  const comments = page.getByTestId('comment')
  await expect(comments).toHaveCount(5)
  const boxes = (await comments.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON()))) as DOMRect[]
  for (const b of boxes) expect(b.x).toBeGreaterThanOrEqual(sheet.x + sheet.width)
  const sorted = [...boxes].sort((a, b) => a.y - b.y)
  for (let i = 1; i < sorted.length; i++) expect(sorted[i].y).toBeGreaterThanOrEqual(sorted[i - 1].y + sorted[i - 1].height)
  // 4. 'Out-of-stock…' level with the document title (±4px), above the others.
  const whole = finding(page.locator('body'), 'Out-of-stock is called costlier')
  const titleBox = (await page.locator('[data-field="design"]').boundingBox())!
  expect(Math.abs((await whole.boundingBox())!.y - titleBox.y)).toBeLessThanOrEqual(4)
  expect((await whole.boundingBox())!.y).toBe(sorted[0].y)
  // 3. Expanding 'Average check…' puts its top level with Key Metric in Evaluation (Online) (±4px).
  const avg = finding(page.locator('body'), 'Average check does not measure')
  await expand(avg)
  const km = docSection(page, 'evaluation-online').locator('dt', { hasText: 'Key Metric' }).locator('..')
  await expect.poll(async () => Math.abs((await avg.boundingBox())!.y - (await km.boundingBox())!.y)).toBeLessThanOrEqual(4)
})

test('AT-37 a section review replaces only its findings', async ({ page }) => {
  await afterAT32(page)
  const panel = reviewPanel(page)
  const antigoals = finding(panel, 'Antigoals are not stated')
  await expand(antigoals)
  await antigoals.getByRole('button', { name: 'Dismiss' }).click()
  await mockOpenRouter.scenario('R2')
  await runReview(page, 'Evaluation (Online)')
  await expect(finding(panel, 'Primary metric is a revenue proxy')).toHaveCount(1)
  // Evaluation (Online) has exactly one finding, in every tab; the three earlier ones are nowhere.
  const tabs = ['Open', 'Resolved', 'Dismissed']
  let eoTotal = 0
  for (const t of tabs) {
    await panel.getByRole('tab', { name: new RegExp(`^${t}`) }).click()
    eoTotal += await panel.getByRole('region', { name: 'Evaluation (Online)' }).getByTestId('finding').count()
    for (const old of R1_TITLES.slice(0, 3)) await expect(finding(panel, old)).toHaveCount(0)
  }
  expect(eoTotal).toBe(1)
  // 'Antigoals…' is still Dismissed; 'Out-of-stock…' still in Whole design.
  await panel.getByRole('tab', { name: /^Dismissed/ }).click()
  await expect(finding(panel, 'Antigoals are not stated')).toHaveCount(1)
  await panel.getByRole('tab', { name: /^Open/ }).click()
  await expect(panel.getByRole('region', { name: 'Whole design' })).toContainText('Out-of-stock is called costlier')
})

test('AT-38 stale findings', async ({ page }) => {
  await afterAT32(page)
  // 1. A new Key Metric value → 'Field changed since review' in the panel and the document.
  await setCardValue(page, 'evaluation-online', 'Key Metric', 'Waste plus lost sales')
  await expect(finding(reviewPanel(page), 'Average check does not measure')).toContainText('Field changed since review')
  await toMode(page, 'Document')
  await expect(finding(page.getByRole('complementary', { name: 'Comments' }), 'Average check does not measure')).toContainText('Field changed since review')
  await toMode(page, 'Canvas')
  // 2. Key Metric deleted → the finding moves to Whole design with 'Field removed'.
  await openDetails(page, 'evaluation-online')
  await dialog(page).getByRole('button', { name: 'Delete property 2' }).click()
  await dialog(page).getByRole('button', { name: 'Close' }).first().click()
  const whole = reviewPanel(page).getByRole('region', { name: 'Whole design' })
  await expect(finding(whole, 'Average check does not measure')).toContainText('Field removed')
})

test('AT-39 review errors and Cancel', async ({ page }) => {
  await afterAT32(page)
  const steps: [Parameters<typeof mockOpenRouter.scenario>[0], RegExp, string][] = [
    ['401', /OpenRouter rejected your key/, 'Replace key'],
    ['402', /out of credits/, 'Run again'],
    ['429', /limiting requests/, 'Run again'],
    ['bad_output', /could not be read/, 'Run again'],
  ]
  for (const [scenario, text, action] of steps) {
    await mockOpenRouter.scenario(scenario)
    await runReview(page)
    const alert = reviewPanel(page).getByRole('alert')
    await expect(alert).toContainText(text)
    await expect(alert.getByRole('button', { name: action })).toBeVisible()
    await expectCounts(page, 1, 2, 2)
    for (const t of R1_TITLES.slice(0, 4)) await expect(finding(reviewPanel(page), t).or(reviewPanel(page).getByRole('button', { name: /minor — show/ })).first()).toBeVisible()
  }
  // 5. A 5 s answer, Cancel → stopped, findings as before.
  await mockOpenRouter.scenario('R2', 5000)
  await runReview(page)
  await reviewPanel(page).getByRole('status').getByRole('button', { name: 'Cancel' }).click()
  await expect(reviewPanel(page).getByRole('status')).toBeHidden()
  await expectCounts(page, 1, 2, 2)
  await expect(badge(page, 'evaluation-online')).toHaveText('3 findings')
  await expect(finding(reviewPanel(page), 'Primary metric is a revenue proxy')).toHaveCount(0)
})

test('AT-40 findings stay out of exports', async ({ page, browserName }) => {
  const drive = await stubGoogle(page)
  await afterAT32(page)
  const banned = [...R1_TITLES, 'What the design says', 'Why it matters', 'Show fix']
  // Markdown.
  const { download } = await exportMarkdown(page, 'none')
  const zip = await readZip(download!)
  const md = await zip.file(Object.keys(zip.files).find((f) => f.endsWith('.md'))!)!.async('string')
  for (const b of banned) expect(md).not.toContain(b)
  // Google Docs (Drive mock).
  await page.getByRole('button', { name: 'Share', exact: true }).click()
  await page.getByRole('menu', { name: 'Share' }).getByRole('menuitem').first().click()
  await expect(page.getByTestId('toast')).toContainText('Google Doc created')
  for (const b of banned) expect(drive[0].body).not.toContain(b)
  // PDF, as in AT-14.
  await toMode(page, 'Document')
  await page.emulateMedia({ media: 'print' })
  const text = browserName === 'chromium' ? await pdfText(page) : await page.locator('body').innerText()
  expect(text).toContain('Supermegaretail Demand Forecasting')
  for (const b of banned) expect(text).not.toContain(b)
})

for (const who of ['guest', 'signed-in'] as const)
  test(`AT-41 export to Google Docs (${who})`, async ({ page }) => {
    let drive = await stubGoogle(page)
    if (who === 'guest') {
      await page.goto('/local')
      await loadExample(page)
    } else await openExampleWithKey(page)
    // 1. Share: the first item is Export to Google Docs → 'Google Doc created' with Open and Copy link.
    const share = () => page.getByRole('button', { name: 'Share', exact: true }).click()
    await share()
    const first = page.getByRole('menu', { name: 'Share' }).getByRole('menuitem').first()
    await expect(first).toContainText('Export to Google Docs')
    await first.click()
    const toast = page.getByTestId('toast')
    await expect(toast).toContainText('Google Doc created')
    await expect(toast.getByRole('button', { name: 'Open' })).toBeVisible()
    await expect(toast.getByRole('button', { name: 'Copy link' })).toBeVisible()
    // 2. One create request: a Google Doc; the title, all 9 headings, exactly 3 PNGs, no SVG.
    expect(drive.map((r) => r.kind)).toEqual(['create'])
    expect(drive[0].body).toContain('"mimeType":"application/vnd.google-apps.document"')
    expect(drive[0].body).toContain('Supermegaretail Demand Forecasting')
    for (const [, name] of SECTION_ORDER) expect(drive[0].body).toContain(name.replace('&', '&amp;'))
    expect(drive[0].body.match(/data:image\/png;base64,/g)).toHaveLength(3)
    expect(drive[0].body).not.toMatch(/<svg|image\/svg/i)
    // 3. Again → a second create, no update; Share shows 'Last exported'.
    await share()
    await page.getByRole('menu', { name: 'Share' }).getByRole('menuitem').first().click()
    await expect.poll(() => drive.length).toBe(2)
    expect(drive.map((r) => r.kind)).toEqual(['create', 'create'])
    await share()
    await expect(page.getByTestId('last-export')).toContainText('Last exported')
    await page.keyboard.press('Escape')
    // 4. Access to Drive denied → 'Nothing was exported', no create request.
    await page.unrouteAll()
    await page.reload()
    drive = await stubGoogle(page, { gis: 'deny' })
    await share()
    await page.getByRole('menu', { name: 'Share' }).getByRole('menuitem').first().click()
    await expect(page.getByTestId('toast')).toContainText('Nothing was exported')
    expect(drive).toHaveLength(0)
  })

test('AT-42 the review survives a reload', async ({ page }) => {
  await afterAT32(page)
  const crit = finding(reviewPanel(page), 'Average check does not measure the stated goal')
  await expand(crit)
  const saved = page.waitForResponse((r) => r.url().includes('/rest/v1/findings') && r.request().method() === 'PATCH')
  await crit.getByRole('button', { name: 'Resolve' }).click()
  await expect(badge(page, 'evaluation-online')).toHaveText('2 findings')
  expect((await saved).ok()).toBe(true)
  await page.reload()
  await expect(badge(page, 'evaluation-online')).toHaveText('2 findings')
  await badge(page, 'evaluation-online').click()
  await expectCounts(page, 0, 2, 2)
  await reviewPanel(page).getByRole('tab', { name: /^Resolved/ }).click()
  await expect(finding(reviewPanel(page), 'Average check does not measure the stated goal')).toHaveCount(1)
})

test('AT-43 M2 header', async ({ page }) => {
  await openExampleWithKey(page)
  const header = page.locator('header').first()
  // 1. The avatar is left of AI Review and Share.
  const avatar = (await header.getByRole('img', { name: 'Google profile photo' }).boundingBox())!
  expect(avatar.x).toBeLessThan((await header.getByRole('button', { name: 'AI Review', exact: true }).boundingBox())!.x)
  expect(avatar.x).toBeLessThan((await header.getByRole('button', { name: 'Share', exact: true }).boundingBox())!.x)
  // 2. Share in order: Export to Google Docs, Export PDF, Export Markdown.
  await header.getByRole('button', { name: 'Share', exact: true }).click()
  const items = page.getByRole('menu', { name: 'Share' }).getByRole('menuitem')
  await expect(items).toHaveCount(3)
  await expect(items.nth(0)).toContainText('Export to Google Docs')
  await expect(items.nth(1)).toHaveText('Export PDF')
  await expect(items.nth(2)).toHaveText('Export Markdown')
  await page.keyboard.press('Escape')
  // 3. No 'Coming soon' in AI Review.
  await header.getByRole('button', { name: 'AI Review', exact: true }).click()
  await expect(page.getByRole('menu', { name: 'AI Review' })).toBeVisible()
  await expect(page.getByRole('menu', { name: 'AI Review' })).not.toContainText('Coming soon')
  await page.keyboard.press('Escape')
  // 4. Account menu: My designs, AI Review settings, Sign out.
  await header.getByRole('button', { name: 'Account menu' }).click()
  await expect(page.getByRole('menu', { name: 'Account menu' }).getByRole('menuitem')).toHaveText(['My designs', 'AI Review settings', 'Sign out'])
})

import { emptyDesign } from '../../src/model/design'
import { setCardValue, setTitle, waitSaved } from '../helpers'
import { expect, localStore, signedInClient, signInAsTestUser, test } from './fixtures'

const domain = (data: { sections: { id: string; keyProperties: { key: string; value: string }[] }[] }) =>
  data.sections.find((s) => s.id === 'problem-space')!.keyProperties.find((p) => p.key === 'Domain')!.value

test('m2-auth-02: on sign-in the guest design becomes a new cloud design; cloud designs are untouched; IndexedDB is cleared', async ({ page }) => {
  const db = await signedInClient()
  const cloudA = { ...emptyDesign(), title: 'Cloud A' }
  await db.from('designs').insert({ origin: 'blank', title: 'Cloud A', data: cloudA, summary: { filledSections: [], tradeoffs: 0, mlTask: null } })

  await page.goto('/local')
  await setTitle(page, 'Mine')
  await setCardValue(page, 'problem-space', 'Domain', 'Payments')
  await waitSaved(page)
  await signInAsTestUser(page)

  await expect.poll(async () => (await db.from('designs').select('title').order('title')).data).toEqual([{ title: 'Cloud A' }, { title: 'Mine' }])
  const rows = (await db.from('designs').select('title, origin, client_id, data, version, summary').order('title')).data!
  expect(rows[0]).toMatchObject({ title: 'Cloud A', version: 1, data: cloudA, client_id: null })
  expect(rows[1]).toMatchObject({ title: 'Mine', origin: 'blank', version: 1, summary: { filledSections: ['problem-space'], tradeoffs: 0, mlTask: null } })
  expect(domain(rows[1].data)).toBe('Payments')
  expect(rows[1].client_id).toEqual(expect.any(String))
  await expect.poll(() => localStore(page)).toEqual({})
})

test('m2-auth-02: a failed import keeps the local design', async ({ page }) => {
  await page.goto('/local')
  await setTitle(page, 'Mine')
  await waitSaved(page)
  await page.route('http://127.0.0.1:54321/rest/v1/designs*', (route) =>
    route.request().method() === 'POST' ? route.fulfill({ status: 500, json: { message: 'boom' } }) : route.fallback(),
  )
  await signInAsTestUser(page)
  const db = await signedInClient()
  expect((await db.from('designs').select('id')).data).toEqual([])
  const local = await localStore(page)
  expect((local.current as { title: string }).title).toBe('Mine')

  // The next sign-in (here: a reload with the session) moves it, once.
  await page.unrouteAll()
  await page.reload()
  await expect.poll(async () => (await db.from('designs').select('title')).data).toEqual([{ title: 'Mine' }])
  await expect.poll(() => localStore(page)).toEqual({})
  await page.reload()
  // The photo shows once the move attempt on load has finished.
  await page.getByRole('img', { name: 'Google profile photo' }).waitFor()
  expect((await db.from('designs').select('title')).data).toEqual([{ title: 'Mine' }])
})

test('m2-auth-02: an empty local design is not imported', async ({ page }) => {
  await page.goto('/local')
  await setCardValue(page, 'problem-space', 'Domain', 'x')
  await setCardValue(page, 'problem-space', 'Domain', '')
  await waitSaved(page)
  expect(Object.keys(await localStore(page))).toContain('current')
  await signInAsTestUser(page)
  const db = await signedInClient()
  await page.reload()
  await page.getByRole('img', { name: 'Google profile photo' }).waitFor()
  expect((await db.from('designs').select('id')).data).toEqual([])
})

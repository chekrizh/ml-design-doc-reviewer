import { exampleDesign } from '../../src/fixtures/example'
import { expect, signedInClient, test } from './fixtures'

test('m2-db-01: insert and update through REST store and return the same JSON the client sent', async () => {
  const db = await signedInClient()
  const data = JSON.parse(JSON.stringify(exampleDesign()))
  const summary = { filledSections: ['problem-space'], tradeoffs: 7, mlTask: 'Regression' }
  const ins = await db.from('designs').insert({ origin: 'example', source_id: 'retail-demand-forecasting', title: data.title, data, summary }).select('id, data, summary, version').single()
  expect(ins.error).toBeNull()
  expect(ins.data!.data).toEqual(data)
  expect(ins.data!.summary).toEqual(summary)
  expect(ins.data!.version).toBe(1)

  const changed = { ...data, title: 'Renamed' }
  const upd = await db.from('designs').update({ data: changed, title: 'Renamed' }).eq('id', ins.data!.id).eq('version', 1).select('data, version').single()
  expect(upd.error).toBeNull()
  expect(upd.data).toEqual({ data: changed, version: 2 })

  const read = await db.from('designs').select('data').eq('id', ins.data!.id).single()
  expect(read.data!.data).toEqual(changed)

  const other = await signedInClient('test-b@example.test')
  expect((await other.from('designs').select('id')).data).toEqual([])
})

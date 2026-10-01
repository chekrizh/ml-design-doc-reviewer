import { readdirSync, readFileSync } from 'node:fs'
import { expect, it } from 'vitest'

// Canvas and Document read and write design data only through the Zustand store.
it('UI modules do not touch persistence directly', () => {
  for (const dir of ['canvas', 'document', 'editor']) {
    for (const f of readdirSync(`src/${dir}`).filter((f) => f.endsWith('.tsx') || f.endsWith('.ts'))) {
      const code = readFileSync(`src/${dir}/${f}`, 'utf8')
      expect(code, `${dir}/${f}`).not.toMatch(/persist|indexedDB|localStorage/)
    }
  }
})

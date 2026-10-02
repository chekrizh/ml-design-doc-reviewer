import { expect, it } from 'vitest'
import { pickModels } from './models.ts'

const m = (id: string, name: string, input: string[]) => ({ id, name, architecture: { input_modalities: input }, pricing: { prompt: '1' } })
const all = [m('z/text', 'A text', ['text']), m('b/v', 'Beta', ['text', 'image']), m('a/v', 'Alpha', ['image', 'text']), m('r/v', 'Zeta', ['text', 'image'])]

it('keeps image-capable models, recommended first and default, the rest by name, no prices', () => {
  expect(pickModels(all, 'r/v')).toEqual({ models: [{ id: 'r/v', name: 'Zeta' }, { id: 'a/v', name: 'Alpha' }, { id: 'b/v', name: 'Beta' }], default: 'r/v' })
})

it('falls back to the first model when the recommended one is missing', () => {
  expect(pickModels(all, 'gone/x').default).toBe('a/v')
  expect(pickModels([], 'x')).toEqual({ models: [], default: null })
})

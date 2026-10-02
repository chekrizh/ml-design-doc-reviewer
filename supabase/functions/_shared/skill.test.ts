import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { generate, OUT } from '../../../scripts/gen-skill'
import { DIMENSIONS, SKILL } from './skill.generated.ts'

it('skill.generated.ts is up to date with vendor/ (run `pnpm gen:skill`)', () => {
  expect(readFileSync(OUT, 'utf8')).toBe(generate())
})

it('has SKILL.md with its references and the 10 base dimensions plus Modern AI', () => {
  expect(SKILL).toContain('<file name="SKILL.md">')
  expect(SKILL).toContain('<file name="references/rubrics.md">')
  expect(DIMENSIONS).toHaveLength(11)
  expect(DIMENSIONS[0]).toBe('Problem framing, goals & antigoals')
  expect(DIMENSIONS.at(-1)).toBe('Modern AI')
})

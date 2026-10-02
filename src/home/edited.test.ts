import { expect, it } from 'vitest'
import { formatEdited } from './edited'

it('formats edit times like the mockup', () => {
  const now = new Date(2026, 9, 2, 15, 0)
  expect(formatEdited(new Date(2026, 9, 2, 14, 59, 40), now)).toBe('Just now')
  expect(formatEdited(new Date(2026, 9, 2, 14, 59), now)).toBe('1 minute ago')
  expect(formatEdited(new Date(2026, 9, 2, 14, 5), now)).toBe('55 minutes ago')
  expect(formatEdited(new Date(2026, 9, 2, 13, 0), now)).toBe('2 hours ago')
  expect(formatEdited(new Date(2026, 9, 1, 23, 0), now)).toBe('Yesterday')
  expect(formatEdited(new Date(2026, 8, 12, 9, 0), now)).toBe('12 Sep')
  expect(formatEdited(new Date(2025, 8, 12, 9, 0), now)).toBe('12 Sep 2025')
})

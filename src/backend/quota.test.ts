import { describe, expect, it } from 'vitest'
import { quotaMessage } from './quota'

describe('quotaMessage', () => {
  it('names each database quota (D36)', () => {
    expect(quotaMessage({ code: '23514', message: 'new row for relation "designs" violates check constraint "designs_data_size"' })).toBe(
      'This design is over 2 MB (usually pasted images in diagrams). Remove some to save it.',
    )
    expect(quotaMessage({ code: '23514', message: 'violates check constraint "designs_title_length"' })).toBe('The title is longer than 200 characters.')
    expect(quotaMessage({ code: 'P0001', message: 'quota_exceeded' })).toBe('You have 50 designs, the most an account can keep. Delete one to make room.')
  })

  it('is null for anything else', () => {
    expect(quotaMessage({ code: '42501', message: 'permission denied' })).toBeNull()
    expect(quotaMessage(new Error('network'))).toBeNull()
    expect(quotaMessage(null)).toBeNull()
  })
})

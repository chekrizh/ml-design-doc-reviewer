import { expect, it } from 'vitest'
import { logLine } from './log.ts'

it('a log line has only fn, code, duration and run id: never keys, headers or bodies', () => {
  const line = logLine({
    fn: 'review',
    code: 'ok',
    ms: 12,
    run_id: 'r1',
    key: 'sk-or-v1-test-valid-0000a3f9',
    headers: { Authorization: 'Bearer sk-or-v1-test-valid-0000a3f9' },
    body: { design: 'secret plans' },
  })
  expect(JSON.parse(line)).toEqual({ fn: 'review', code: 'ok', ms: 12, run_id: 'r1' })
  expect(line).not.toContain('sk-or-v1')
  expect(line).not.toContain('Authorization')
  expect(line).not.toContain('secret plans')
})

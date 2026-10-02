import { expect, it } from 'vitest'
import { corsHeaders } from './cors.ts'

it('allows only the configured app origins', () => {
  const list = 'http://localhost:4173, https://app.vercel.app'
  expect(corsHeaders('https://app.vercel.app', list)['Access-Control-Allow-Origin']).toBe('https://app.vercel.app')
  expect(corsHeaders('https://evil.example', list)['Access-Control-Allow-Origin']).toBeUndefined()
  expect(corsHeaders(null, list)['Access-Control-Allow-Origin']).toBeUndefined()
  expect(corsHeaders('http://localhost:4173', undefined)['Access-Control-Allow-Origin']).toBeUndefined()
})

import { describe, expect, it, vi } from 'vitest'

vi.stubGlobal('window', { addEventListener: () => {} })
const { parseRoute, routePath } = await import('./router')

describe('parseRoute', () => {
  it('maps the five routes and sends anything else home', () => {
    expect(parseRoute('/')).toEqual({ name: 'home' })
    expect(parseRoute('/local')).toEqual({ name: 'local' })
    expect(parseRoute('/privacy')).toEqual({ name: 'privacy' })
    expect(parseRoute('/d/1b2c')).toEqual({ name: 'cloud', id: '1b2c' })
    expect(parseRoute('/library/retail-demand-forecasting')).toEqual({ name: 'library', itemId: 'retail-demand-forecasting' })
    expect(parseRoute('/nope/x/y')).toEqual({ name: 'home' })
    expect(parseRoute('/d/')).toEqual({ name: 'home' })
  })

  it('round-trips through routePath', () => {
    for (const p of ['/', '/local', '/privacy', '/d/abc', '/library/superpay-fraud']) expect(routePath(parseRoute(p))).toBe(p)
  })
})

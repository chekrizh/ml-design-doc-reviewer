import { describe, expect, it } from 'vitest'
import { INITIAL_LAYOUT } from '../model/design'
import { flow } from './flow'

const item = (i: string, x: number, y: number, w: number, h: number, moved = false) => ({ i, x, y, w, h, moved })

describe('flow', () => {
  it('keeps the mockup rows and puts each row under the tallest card above it', () => {
    const tall = INITIAL_LAYOUT.map((l) => ({ ...l, h: l.i === 'problem-space' ? 12 : 5 }))
    const out = flow(tall, 12)
    const at = (i: string) => out.find((l) => l.i === i)!
    expect(at('problem-space')).toMatchObject({ x: 0, y: 0 })
    expect(at('baseline')).toMatchObject({ x: 9, y: 0 })
    expect(at('validation')).toMatchObject({ x: 0, y: 12 })
    expect(at('data-features')).toMatchObject({ x: 6, y: 12 })
    expect(at('evaluation-online')).toMatchObject({ x: 0, y: 17 })
    expect(at('target-solution')).toMatchObject({ x: 0, y: 22, w: 12 })
  })

  it('orders by y then x and wraps a card that does not fit', () => {
    const out = flow([item('b', 6, 0, 6, 3), item('a', 0, 0, 7, 4), item('c', 0, 9, 3, 2)], 12)
    expect(out).toEqual([item('b', 0, 4, 6, 3), item('a', 0, 0, 7, 4), item('c', 6, 4, 3, 2)])
  })

  it('puts a dragged card into the nearest row, before the card at its x', () => {
    const rows = [item('a', 0, 0, 6, 10), item('b', 6, 0, 6, 10), item('c', 0, 10, 6, 10)]
    // c dragged up so that its top is 2 rows below row 0: it lands first in row 0.
    const out = flow([rows[0], rows[1], item('c', 0, 2, 6, 10, true)], 12)
    expect(out).toEqual([item('a', 6, 0, 6, 10), item('b', 0, 10, 6, 10), item('c', 0, 0, 6, 10)])
  })

  it('clamps a card wider than the grid', () => {
    expect(flow([item('a', 0, 0, 20, 1)], 12)).toEqual([item('a', 0, 0, 12, 1)])
  })
})

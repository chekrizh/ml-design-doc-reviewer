import { expect, it, vi } from 'vitest'

const { exportToSvg } = vi.hoisted(() => ({ exportToSvg: vi.fn() }))
vi.mock('@excalidraw/excalidraw', () => ({ exportToSvg }))

import { diagramToSvg } from './svg'

it('does not cache a failed render, so the next call retries', async () => {
  const d = { elements: [{ id: 'a' }], files: {} }
  exportToSvg.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce({ outerHTML: '<svg/>' })
  await expect(diagramToSvg(d)).rejects.toThrow('boom')
  await expect(diagramToSvg(d)).resolves.toBe('<svg/>')
})

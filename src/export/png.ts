import type { Diagram } from '../model/design'

/** The long side of a diagram PNG (docs/backend-spec.md §8.1). Small diagrams are drawn at up to 2× for legibility. */
export const MAX_SIDE = 1600

const cache = new WeakMap<Diagram, Promise<string>>()

/**
 * Base64 PNG (no data: prefix) of a diagram, white background, long side ≤ 1600 px.
 * The same image goes to the review (images for the model) and to the Google Docs export.
 */
export function diagramToPng(d: Diagram): Promise<string> {
  let png = cache.get(d)
  if (!png) {
    png = import('@excalidraw/excalidraw').then(async ({ exportToBlob }) => {
      const blob = await exportToBlob({
        elements: d.elements.filter((e) => !e.isDeleted) as never,
        files: d.files as never,
        mimeType: 'image/png',
        appState: { exportBackground: true, viewBackgroundColor: '#ffffff' },
        exportPadding: 16,
        getDimensions: (width: number, height: number) => {
          const scale = Math.min(2, MAX_SIDE / Math.max(width, height))
          return { width: Math.floor(width * scale), height: Math.floor(height * scale), scale }
        },
      })
      const bytes = new Uint8Array(await blob.arrayBuffer())
      let bin = ''
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
      return btoa(bin)
    })
    cache.set(d, png)
    png.catch(() => cache.get(d) === png && cache.delete(d))
  }
  return png
}

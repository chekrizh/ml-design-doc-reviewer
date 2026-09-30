import { useEffect, useState } from 'react'
import type { Diagram } from '../model/design'
import { diagramNonEmpty } from '../model/rules'

const cache = new WeakMap<Diagram, Promise<string>>()

/** SVG markup of a diagram. Excalidraw is loaded lazily: it is large. */
export function diagramToSvg(d: Diagram): Promise<string> {
  let svg = cache.get(d)
  if (!svg) {
    svg = import('@excalidraw/excalidraw').then(async ({ exportToSvg }) => {
      const el = await exportToSvg({
        // Stored scenes are plain JSON; Excalidraw restores missing fields on export.
        elements: d.elements.filter((e) => !e.isDeleted) as never,
        files: d.files as never,
        appState: { exportBackground: true, viewBackgroundColor: '#ffffff' },
        exportPadding: 10,
        skipInliningFonts: true,
      })
      return el.outerHTML
    })
    cache.set(d, svg)
  }
  return svg
}

export const svgDataUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`

/** Data URL of the diagram image, or null while rendering or when the diagram is empty. */
export function useDiagramImage(d: Diagram): string | null {
  const [img, setImg] = useState<{ d: Diagram; url: string } | null>(null)
  useEffect(() => {
    if (!diagramNonEmpty(d)) return
    let live = true
    diagramToSvg(d).then((svg) => live && setImg({ d, url: svgDataUrl(svg) }))
    return () => {
      live = false
    }
  }, [d])
  // Keep showing the previous image until the new one is ready, so the thumbnail does not flicker.
  return diagramNonEmpty(d) ? (img?.url ?? null) : null
}

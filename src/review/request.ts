// The body of a `review` call (docs/backend-spec.md §6.4): the design without diagram files,
// and a PNG for each non-empty diagram (§8.1). The same PNGs go to the Google Docs export.
import type { ReviewImage } from '@review/prompt.ts'
import type { SectionId } from '@review/types.ts'
import type { Design, Diagram } from '../model/design'
import { diagramNonEmpty } from '../model/rules'

export interface ReviewRequest {
  runId: string
  designId: string
  scope: 'design' | SectionId
  design: Design
  images: ReviewImage[]
}

/** Base64 PNG (no data: prefix) of a diagram. */
export type Rasterize = (d: Diagram) => Promise<string>

export async function reviewRequest(design: Design, designId: string, runId: string, scope: 'design' | SectionId, rasterize: Rasterize): Promise<ReviewRequest> {
  const drawn = design.sections.filter((s) => diagramNonEmpty(s.diagram))
  const images = await Promise.all(drawn.map(async (s) => ({ section: s.id, png: await rasterize(s.diagram) })))
  return {
    runId,
    designId,
    scope,
    design: { ...design, sections: design.sections.map((s) => ({ ...s, diagram: { elements: s.diagram.elements, files: {} } })) },
    images,
  }
}

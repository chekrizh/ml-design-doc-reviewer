import type { Design, SectionId } from './design'
import { sectionEmpty, tradeoffsComplete } from './rules'

/** What the 'Your designs' list shows without loading `data` (designs.summary, docs/backend-spec.md §5.3). */
export interface DesignSummary {
  filledSections: SectionId[]
  tradeoffs: number
  mlTask: string | null
}

export const designSummary = (d: Design): DesignSummary => ({
  filledSections: d.sections.filter((s) => !sectionEmpty(s)).map((s) => s.id),
  tradeoffs: d.sections.filter((s) => tradeoffsComplete(s.tradeoffs)).length,
  mlTask:
    d.sections
      .find((s) => s.id === 'problem-space')
      ?.keyProperties.find((p) => p.key === 'ML Task')
      ?.value.trim() || null,
})

/** A guest design worth moving to the account: a title or at least one filled section (§5.4). */
export const designHasContent = (d: Design): boolean => d.title.trim() !== '' || d.sections.some((s) => !sectionEmpty(s))

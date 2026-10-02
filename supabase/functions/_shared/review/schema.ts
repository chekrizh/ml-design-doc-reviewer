// The model's answer: JSON schema for structured outputs and its validator (docs/backend-spec.md §6.5).
import { DIMENSIONS } from '../skill.generated.ts'
import { SECTION_IDS, SEVERITIES, type SectionId, type Severity } from './types.ts'

export interface ModelFinding {
  severity: Severity
  dimension: string
  section: SectionId | null
  anchor: string | null
  title: string
  evidence: string
  why: string
  fix: string
}

const FIELDS = ['severity', 'dimension', 'section', 'anchor', 'title', 'evidence', 'why', 'fix'] as const

export const FINDINGS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['findings'],
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [...FIELDS],
        properties: {
          severity: { type: 'string', enum: [...SEVERITIES] },
          dimension: { type: 'string', enum: [...DIMENSIONS] },
          section: { type: ['string', 'null'], enum: [...SECTION_IDS, null] },
          anchor: { type: ['string', 'null'] },
          title: { type: 'string' },
          evidence: { type: 'string' },
          why: { type: 'string' },
          fix: { type: 'string' },
        },
      },
    },
  },
} as const

/** Parses the model's message content; null when it is not JSON or does not follow the schema (bad_output). */
export function parseFindings(content: unknown): ModelFinding[] | null {
  let data: unknown
  try {
    data = typeof content === 'string' ? JSON.parse(content) : content
  } catch {
    return null
  }
  if (!data || typeof data !== 'object' || !Array.isArray((data as { findings?: unknown }).findings)) return null
  const out: ModelFinding[] = []
  for (const f of (data as { findings: Record<string, unknown>[] }).findings) {
    if (!f || typeof f !== 'object') return null
    const str = (k: string) => typeof f[k] === 'string'
    if (!SEVERITIES.includes(f.severity as Severity)) return null
    if (!(DIMENSIONS as readonly string[]).includes(f.dimension as string)) return null
    if (!(f.section === null || SECTION_IDS.includes(f.section as SectionId))) return null
    if (!(f.anchor === null || str('anchor'))) return null
    if (!['title', 'evidence', 'why', 'fix'].every(str)) return null
    out.push({
      severity: f.severity as Severity,
      dimension: f.dimension as string,
      section: f.section as SectionId | null,
      anchor: f.anchor as string | null,
      title: f.title as string,
      evidence: f.evidence as string,
      why: f.why as string,
      fix: f.fix as string,
    })
  }
  return out
}

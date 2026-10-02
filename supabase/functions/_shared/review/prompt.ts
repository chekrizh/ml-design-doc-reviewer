// The OpenRouter request for a review (docs/backend-spec.md §6.4 step 6, §6.6).
import { SKILL } from '../skill.generated.ts'
import { FINDINGS_SCHEMA } from './schema.ts'
import { serializeDesign } from './serialize.ts'
import { sectionName, type ReviewDesign, type SectionId } from './types.ts'

export interface ReviewImage {
  section: SectionId
  /** Base64 PNG without the data: prefix. */
  png: string
}

export function instruction(scope: 'design' | SectionId): string {
  return [
    'You review an ML system design document with the skill below.',
    'Skill mode: doc-only, stage: design doc. Review only the document in the user message; there is no repository or code.',
    'Do not produce a scorecard, gradecard, verdict, praise or a fix plan. Return only findings in the given JSON schema.',
    'Each finding is one problem. "evidence" is what the design says (or what it lacks), "why" is why it matters, "fix" is one concrete action. Keep "title" under 90 characters.',
    'Set "section" and "anchor" to the narrowest field the finding is about: "anchor" is a label from the design text ("kp:<id>", "opt:<id>" or "rationale"). If the dimension has no section, set both to null.',
    'Problem Space is the problem statement.',
    ...(scope === 'design' ? [] : [`Review only the section [section:${scope}] (${sectionName(scope)}); the rest of the design is context.`]),
    'Write findings in English, the language of the interface.',
  ].join('\n')
}

export function buildMessages(design: ReviewDesign, scope: 'design' | SectionId, images: ReviewImage[]) {
  return [
    {
      role: 'system',
      content: [
        { type: 'text', text: instruction(scope) },
        // Providers without prompt caching ignore cache_control.
        { type: 'text', text: SKILL, cache_control: { type: 'ephemeral' } },
      ],
    },
    {
      role: 'user',
      // Text first, then the images: as OpenRouter recommends.
      content: [
        { type: 'text', text: serializeDesign(design) },
        ...images.flatMap((im) => [
          { type: 'text', text: `Diagram of section ${sectionName(im.section)} [section:${im.section}]` },
          { type: 'image_url', image_url: { url: `data:image/png;base64,${im.png}` } },
        ]),
      ],
    },
  ]
}

export function buildRequest(model: string, design: ReviewDesign, scope: 'design' | SectionId, images: ReviewImage[]) {
  return {
    model,
    max_tokens: 8000,
    provider: { require_parameters: true },
    response_format: { type: 'json_schema', json_schema: { name: 'findings', strict: true, schema: FINDINGS_SCHEMA } },
    messages: buildMessages(design, scope, images),
  }
}

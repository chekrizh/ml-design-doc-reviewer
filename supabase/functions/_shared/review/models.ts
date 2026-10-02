// The model list for AI Review settings (docs/backend-spec.md §6.3).
export interface OpenRouterModel {
  id: string
  name: string
  architecture?: { input_modalities?: string[] }
}

/** Image-capable models; the recommended one first and default (else the first), the rest by name; no prices. */
export function pickModels(all: OpenRouterModel[], recommended: string) {
  const vision = all.filter((m) => m.architecture?.input_modalities?.includes('image')).map((m) => ({ id: m.id, name: m.name }))
  const rec = vision.find((m) => m.id === recommended)
  const rest = vision.filter((m) => m !== rec).sort((a, b) => a.name.localeCompare(b.name))
  const models = rec ? [rec, ...rest] : rest
  return { models, default: models[0]?.id ?? null }
}

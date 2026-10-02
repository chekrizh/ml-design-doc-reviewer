// Models that read images and support structured outputs (docs/backend-spec.md §6.3). No prices.
import { HttpError, json, serve } from '../_shared/http.ts'
import { baseUrl } from '../_shared/openrouter.ts'
import { requireUser } from '../_shared/supabase.ts'
import { pickModels, type OpenRouterModel } from '../_shared/review/models.ts'

const HOUR = 3600_000
let cache: { at: number; models: OpenRouterModel[] } | null = null

serve('openrouter-models', async (req) => {
  await requireUser(req)
  if (!cache || Date.now() - cache.at > HOUR) {
    let res: Response
    try {
      res = await fetch(`${baseUrl()}/models?supported_parameters=structured_outputs`, { signal: AbortSignal.timeout(15_000) })
    } catch {
      throw new HttpError('provider_error')
    }
    if (!res.ok) throw new HttpError('provider_error')
    cache = { at: Date.now(), models: (await res.json()).data ?? [] }
  }
  return json(req, 200, pickModels(cache.models, Deno.env.get('RECOMMENDED_MODEL') ?? ''))
})

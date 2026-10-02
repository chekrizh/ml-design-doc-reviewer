// AI review of a design (docs/backend-spec.md §6.4). Synchronous: the client waits for the answer (D22).
import { HttpError, json, serve } from '../_shared/http.ts'
import { errorMessage, openrouter } from '../_shared/openrouter.ts'
import { insert, requireUser, rpc, select, update } from '../_shared/supabase.ts'
import { resolveFindings } from '../_shared/review/anchors.ts'
import { providerError, type ErrorCode } from '../_shared/review/errors.ts'
import { buildRequest, type ReviewImage } from '../_shared/review/prompt.ts'
import { parseFindings } from '../_shared/review/schema.ts'
import { SECTION_IDS, type ReviewDesign, type SectionId } from '../_shared/review/types.ts'

const MAX_BODY = 6 * 1024 * 1024
const MAX_IMAGES = 9
const MAX_IMAGE = 1.5 * 1024 * 1024
const RUNNING_FOR = 3 * 60 * 1000
const PER_HOUR = 20
const TIMEOUT_MS = 120_000
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

serve('review', async (req, body, log) => {
  // Limits on what the client sends.
  if (Number(req.headers.get('Content-Length') ?? 0) > MAX_BODY) throw new HttpError('payload_too_large')
  const { runId, designId, scope, design, images } = body as { runId: unknown; designId: unknown; scope: unknown; design: ReviewDesign; images: ReviewImage[] }
  if (typeof runId !== 'string' || !UUID.test(runId) || typeof designId !== 'string' || !UUID.test(designId)) throw new HttpError('bad_request')
  if (!(scope === 'design' || SECTION_IDS.includes(scope as SectionId))) throw new HttpError('bad_request')
  if (!design || typeof design !== 'object' || !Array.isArray(design.sections) || !Array.isArray(images)) throw new HttpError('bad_request')
  if (images.length > MAX_IMAGES || images.some((im) => typeof im?.png !== 'string' || (im.png.length * 3) / 4 > MAX_IMAGE)) throw new HttpError('payload_too_large')
  if (JSON.stringify(body).length > MAX_BODY) throw new HttpError('payload_too_large')
  log.run_id = runId

  // 1. The user. 2. Their design (RLS). 3. Their key and model.
  const user = await requireUser(req)
  const [row] = (await select({ jwt: user.jwt }, 'designs', `select=version&id=eq.${designId}`)) as { version: number }[]
  if (!row) throw new HttpError('not_found')
  const key = (await rpc('svc_get_openrouter_key', { p_user: user.id })) as string | null
  if (!key) throw new HttpError('no_key')
  const [settings] = (await select('service', 'user_settings', `select=model&user_id=eq.${user.id}`)) as { model: string | null }[]
  const model = settings?.model || Deno.env.get('RECOMMENDED_MODEL') || ''

  // 4. Limits: one running review per user; stale running runs are timed out; 20 per hour.
  const now = Date.now()
  const recent = (await select('service', 'review_runs', `select=id,status,started_at&user_id=eq.${user.id}&started_at=gte.${new Date(now - 3600_000).toISOString()}`)) as { id: string; status: string; started_at: string }[]
  const running = recent.filter((r) => r.status === 'running')
  const stale = running.filter((r) => now - Date.parse(r.started_at) >= RUNNING_FOR)
  if (stale.length) await update('service', 'review_runs', `id=in.(${stale.map((r) => r.id).join(',')})&status=eq.running`, { status: 'failed', error_code: 'timeout', finished_at: new Date().toISOString() })
  if (running.length > stale.length) throw new HttpError('review_in_progress')
  if (recent.length >= PER_HOUR) throw new HttpError('too_many_reviews')

  // 5. The run, with the design it checks.
  try {
    await insert('service', 'review_runs', { id: runId, design_id: designId, user_id: user.id, scope, model, design_version: row.version, design_snapshot: design })
  } catch {
    throw new HttpError('bad_request')
  }

  try {
    // 6. OpenRouter, at most 2 minutes (the function must answer before Supabase's 150 s idle timeout).
    let res: Response
    try {
      res = await openrouter('/chat/completions', key, {
        method: 'POST',
        body: JSON.stringify(buildRequest(model, design, scope as 'design' | SectionId, images)),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
    } catch (e) {
      throw new HttpError(e instanceof DOMException && e.name === 'TimeoutError' ? 'timeout' : 'provider_error')
    }
    // 7. Provider errors → §6.4 codes.
    if (!res.ok) throw new HttpError(providerError(res.status, await errorMessage(res)))
    let content: unknown
    try {
      content = (await res.json())?.choices?.[0]?.message?.content
    } catch {
      throw new HttpError('bad_output')
    }
    const parsed = parseFindings(content)
    if (!parsed) throw new HttpError('bad_output')

    // 8. Anchors against the snapshot; 9. replace the scope's findings atomically.
    const findings = resolveFindings(parsed, design, scope as 'design' | SectionId)
    const status = await rpc('svc_complete_review_run', { p_run: runId, p_findings: findings })
    if (status === 'canceled') throw new HttpError('canceled')
    if (status !== 'succeeded') throw new HttpError('provider_error')
    const rows = await select('service', 'findings', `select=id,run_id,design_id,position,severity,dimension,section,anchor_kind,anchor_id,anchor_label,anchor_value,title,evidence,why,fix,status,status_changed_at,created_at&run_id=eq.${runId}&order=position`)
    return json(req, 200, { runId, findings: rows })
  } catch (e) {
    // 10. Any error after the run exists marks it failed (a canceled run stays canceled).
    const code: ErrorCode = e instanceof HttpError ? e.code : 'provider_error'
    if (code !== 'canceled') await rpc('svc_fail_review_run', { p_run: runId, p_code: code }).catch(() => null)
    throw e instanceof HttpError ? e : new HttpError(code)
  }
})

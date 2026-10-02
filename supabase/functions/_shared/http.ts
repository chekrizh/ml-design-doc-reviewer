// CORS, JSON responses and errors for the edge functions (docs/backend-spec.md §6.1).
import { ERRORS, type ErrorCode } from './review/errors.ts'
import { corsHeaders } from './review/cors.ts'
import { logLine } from './review/log.ts'

const cors = (req: Request) => corsHeaders(req.headers.get('Origin'), Deno.env.get('APP_ORIGINS'))

export const json = (req: Request, status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(req), 'Content-Type': 'application/json' } })

/** Thrown inside a handler to answer with a §6.4 error. */
export class HttpError extends Error {
  constructor(readonly code: ErrorCode) {
    super(code)
  }
}

export const errorResponse = (req: Request, code: ErrorCode) => json(req, ERRORS[code].status, { error: { code, message: ERRORS[code].text } })

/**
 * Serves a POST-only JSON function: answers OPTIONS for CORS, turns HttpError into §6.4 errors,
 * and logs one line per call with the code and duration only.
 */
export function serve(fn: string, handler: (req: Request, body: Record<string, unknown>, log: { run_id?: string }) => Promise<Response>) {
  Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) })
    const started = Date.now()
    const log: { run_id?: string } = {}
    let res: Response
    let code = 'ok'
    try {
      if (req.method !== 'POST') throw new HttpError('bad_request')
      let body: unknown
      try {
        body = await req.json()
      } catch {
        throw new HttpError('bad_request')
      }
      if (!body || typeof body !== 'object') throw new HttpError('bad_request')
      res = await handler(req, body as Record<string, unknown>, log)
    } catch (e) {
      code = e instanceof HttpError ? e.code : 'internal_error'
      res = e instanceof HttpError ? errorResponse(req, e.code) : json(req, 500, { error: { code: 'internal_error', message: 'Something went wrong' } })
    }
    console.log(logLine({ fn, code, ms: Date.now() - started, run_id: log.run_id }))
    return res
  })
}

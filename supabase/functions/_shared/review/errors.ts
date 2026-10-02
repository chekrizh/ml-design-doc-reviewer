// Review error codes, their HTTP statuses and what the Review panel shows (docs/backend-spec.md §6.4).

export type ErrorAction = 'Replace key' | 'Run again' | 'Choose model' | 'Add key' | null

export const ERRORS = {
  unauthenticated: { status: 401, text: 'Sign in to run AI review', action: null },
  not_found: { status: 404, text: 'This design was not found', action: null },
  invalid_key_format: { status: 400, text: 'This does not look like an OpenRouter key', action: null },
  key_rejected: { status: 502, text: 'OpenRouter rejected your key', action: 'Replace key' },
  no_credits: { status: 502, text: 'Your OpenRouter key is out of credits', action: 'Run again' },
  provider_rate_limited: { status: 502, text: 'OpenRouter is limiting requests', action: 'Run again' },
  model_unsupported: { status: 502, text: '{model} cannot read diagrams', action: 'Choose model' },
  timeout: { status: 504, text: 'The review took longer than 2 minutes', action: 'Run again' },
  provider_error: { status: 502, text: 'OpenRouter did not answer', action: 'Run again' },
  bad_output: { status: 502, text: "The model's answer could not be read", action: 'Run again' },
  no_key: { status: 409, text: 'Add your OpenRouter key', action: 'Add key' },
  review_in_progress: { status: 409, text: 'A review is already running', action: null },
  too_many_reviews: { status: 429, text: '20 reviews in the last hour; try again later', action: null },
  payload_too_large: { status: 413, text: 'The design is too large to review', action: null },
  canceled: { status: 409, text: 'The review was canceled', action: null },
  bad_request: { status: 400, text: 'The request could not be read', action: null },
} as const satisfies Record<string, { status: number; text: string; action: ErrorAction }>

export type ErrorCode = keyof typeof ERRORS

export const isErrorCode = (c: unknown): c is ErrorCode => typeof c === 'string' && c in ERRORS

/** The key check answers 422 for a key OpenRouter rejects (§6.2); the review answers 502 (§6.4). */
export const KEY_REJECTED_ON_SAVE = 422

/** What the panel shows for an error code. */
export const errorText = (code: ErrorCode, model = 'This model') => ERRORS[code].text.replace('{model}', model)

/** Maps an OpenRouter error response to a review error code (§6.4 table). */
export function providerError(status: number, message: string): ErrorCode {
  if (status === 401) return 'key_rejected'
  if (status === 402) return 'no_credits'
  if (status === 429) return 'provider_rate_limited'
  if (status === 408) return 'timeout'
  if ([400, 404, 503].includes(status) && /image|modalit|supported parameters/i.test(message)) return 'model_unsupported'
  return 'provider_error'
}

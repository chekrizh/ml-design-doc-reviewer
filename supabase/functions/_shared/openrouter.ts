// OpenRouter over HTTP (base URL from env: the mock locally, openrouter.ai in production).
export const baseUrl = () => Deno.env.get('OPENROUTER_BASE_URL') || 'https://openrouter.ai/api/v1'

export function openrouter(path: string, key: string, init: RequestInit = {}) {
  return fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'X-Title': 'ML System Design Trainer', ...init.headers },
  })
}

/** OpenRouter's error message ({ error: { message } }), or ''. */
export async function errorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json()
    return String(body?.error?.message ?? '')
  } catch {
    return ''
  }
}

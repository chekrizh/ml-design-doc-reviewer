/**
 * OpenRouter mock (docs/backend-spec.md §9). Plain Node HTTP, no dependencies.
 * Response shapes follow openrouter.ai/docs: GET /key, GET /models, POST /chat/completions,
 * errors as { error: { code, message } } with the same HTTP status.
 * Control: POST /__mock/scenario { chat, delayMs }; GET /__mock/last-request.
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { readFileSync } from 'node:fs'

export const MOCK_PORT = 4010
export const VALID_KEY = 'sk-or-v1-test-valid-0000a3f9'
export type ChatScenario = 'R1' | 'R2' | '401' | '402' | '429' | 'bad_output' | 'no_images'

type AnswerFinding = { section: string | null; anchor: string | null; [k: string]: unknown }
const answer = (name: 'R1' | 'R2') =>
  JSON.parse(readFileSync(new URL(`./answers/${name}.json`, import.meta.url), 'utf8')).findings as AnswerFinding[]

const model = (id: string, name: string, input: string[]) => ({
  id,
  canonical_slug: id,
  name,
  created: 1735689600,
  description: `${name} (mock)`,
  context_length: 200000,
  architecture: { modality: `${input.join('+')}->text`, input_modalities: input, output_modalities: ['text'], tokenizer: 'Other', instruct_type: null },
  pricing: { prompt: '0.000003', completion: '0.000015', request: '0', image: '0.0048' },
  top_provider: { context_length: 200000, max_completion_tokens: 8192, is_moderated: false },
  per_request_limits: null,
  supported_parameters: ['max_tokens', 'temperature', 'response_format', 'structured_outputs'],
  default_parameters: null,
})

export const MODELS = [
  model('openai/gpt-4o-mini', 'OpenAI: GPT-4o-mini', ['text', 'image', 'file']),
  model('google/gemini-2.5-flash', 'Google: Gemini 2.5 Flash', ['text', 'image', 'file', 'audio', 'video']),
  model('deepseek/deepseek-chat', 'DeepSeek: DeepSeek V3', ['text']),
  model('anthropic/claude-sonnet-4.5', 'Anthropic: Claude Sonnet 4.5', ['text', 'image', 'file']),
]

const ERRORS: Record<string, [number, string]> = {
  '401': [401, 'User not found.'],
  '402': [402, 'Insufficient credits. Add more using https://openrouter.ai/settings/credits'],
  '429': [429, 'Rate limit exceeded: free-models-per-min.'],
  no_images: [404, 'No endpoints found that support image input'],
}

/** The design text of the request: every text part of the user message. */
function designText(body: { messages?: { role: string; content: string | { type: string; text?: string }[] }[] }) {
  const user = body.messages?.find((m) => m.role === 'user')
  if (!user) return ''
  return typeof user.content === 'string' ? user.content : user.content.filter((p) => p.type === 'text').map((p) => p.text).join('\n')
}

/** Replaces 'label:<label>' with the [kp:<id>] / [opt:<id>] tag of that field in the section's text. */
export function resolveLabels(findings: AnswerFinding[], text: string) {
  return findings.map((f) => {
    if (!f.anchor?.startsWith('label:') || !f.section) return f
    const label = f.anchor.slice('label:'.length)
    const start = text.indexOf(`[section:${f.section}]`)
    const block = start < 0 ? '' : text.slice(start).split('\n## ')[0]
    const esc = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const m = block.match(new RegExp(`\\[((?:kp|opt):[^\\]]+)\\] ${esc}(?=[: ]|$)`, 'm'))
    return { ...f, anchor: m ? m[1] : null }
  })
}

const json = (res: ServerResponse, status: number, body: unknown) => {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}

const readBody = (req: IncomingMessage) =>
  new Promise<string>((resolve) => {
    let data = ''
    req.on('data', (c) => (data += c))
    req.on('end', () => resolve(data))
  })

export function startOpenRouterMock(port = MOCK_PORT): Promise<Server> {
  let scenario: { chat: ChatScenario; delayMs: number } = { chat: 'R1', delayMs: 0 }
  let lastRequest: { path: string; headers: Record<string, unknown>; body: unknown } | null = null

  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://mock')
    const raw = await readBody(req)
    const auth = req.headers.authorization ?? ''

    if (url.pathname === '/__mock/scenario' && req.method === 'POST') {
      scenario = { chat: 'R1', delayMs: 0, ...JSON.parse(raw || '{}') }
      lastRequest = null
      return json(res, 200, scenario)
    }
    if (url.pathname === '/__mock/last-request') return json(res, 200, lastRequest)

    if (url.pathname === '/api/v1/key' && req.method === 'GET') {
      if (auth !== `Bearer ${VALID_KEY}`) return json(res, 401, { error: { code: 401, message: 'User not found.' } })
      return json(res, 200, {
        data: {
          label: 'sk-or-v1-tes...a3f9', limit: null, limit_reset: null, limit_remaining: null, include_byok_in_limit: false,
          usage: 0, usage_daily: 0, usage_weekly: 0, usage_monthly: 0,
          byok_usage: 0, byok_usage_daily: 0, byok_usage_weekly: 0, byok_usage_monthly: 0,
          is_free_tier: false, free_model_daily_requests: { used: 0, limit: 50, remaining: 50 },
        },
      })
    }

    if (url.pathname === '/api/v1/models' && req.method === 'GET') {
      const wanted = url.searchParams.get('supported_parameters')?.split(',') ?? []
      const data = MODELS.filter((m) => wanted.every((p) => m.supported_parameters.includes(p)))
      return json(res, 200, { data, total_count: data.length, links: { next: null } })
    }

    if (url.pathname === '/api/v1/chat/completions' && req.method === 'POST') {
      const body = JSON.parse(raw || '{}')
      const headers = Object.fromEntries(Object.entries(req.headers).filter(([k]) => k !== 'authorization'))
      lastRequest = { path: url.pathname, headers, body }
      if (scenario.delayMs) await new Promise((r) => setTimeout(r, scenario.delayMs))
      if (res.destroyed) return
      if (auth !== `Bearer ${VALID_KEY}`) return json(res, 401, { error: { code: 401, message: 'User not found.' } })
      const error = ERRORS[scenario.chat]
      if (error) return json(res, error[0], { error: { code: error[0], message: error[1] } })
      const content =
        scenario.chat === 'bad_output'
          ? 'Here is my review of the design. Overall it looks solid; the main risk is the metric.'
          : JSON.stringify({ findings: resolveLabels(answer(scenario.chat as 'R1' | 'R2'), designText(body)) })
      return json(res, 200, {
        id: `gen-mock-${Date.now()}`,
        provider: 'Mock',
        model: body.model,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        choices: [{ logprobs: null, finish_reason: 'stop', native_finish_reason: 'stop', index: 0, message: { role: 'assistant', content, refusal: null, reasoning: null } }],
        usage: { prompt_tokens: 12000, completion_tokens: 900, total_tokens: 12900, prompt_tokens_details: { cached_tokens: 0 }, completion_tokens_details: { reasoning_tokens: 0 }, cost: 0.05 },
      })
    }

    json(res, 404, { error: { code: 404, message: 'Not Found' } })
  })
  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, '127.0.0.1', () => resolve(server))
  })
}

/** Test-side control of the running mock. */
export const mockOpenRouter = {
  scenario: (chat: ChatScenario, delayMs = 0) =>
    fetch(`http://127.0.0.1:${MOCK_PORT}/__mock/scenario`, { method: 'POST', body: JSON.stringify({ chat, delayMs }) }).then((r) => r.json()),
  lastRequest: () => fetch(`http://127.0.0.1:${MOCK_PORT}/__mock/last-request`).then((r) => r.json()),
}

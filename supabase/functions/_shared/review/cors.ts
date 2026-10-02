/** CORS for the edge functions: only origins listed in APP_ORIGINS (comma-separated) (docs/backend-spec.md §6.1). */
export function corsHeaders(origin: string | null, appOrigins: string | undefined): Record<string, string> {
  const allowed = (appOrigins ?? '').split(',').map((o) => o.trim()).filter(Boolean)
  if (!origin || !allowed.includes(origin)) return { Vary: 'Origin' }
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    Vary: 'Origin',
  }
}

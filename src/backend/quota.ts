/** What the user can do about a database quota (D36, supabase/migrations/*_quotas.sql); null for other errors. */
export function quotaMessage(e: unknown): string | null {
  const { code, message = '' } = (e ?? {}) as { code?: string; message?: string }
  if (code === 'P0001' && message === 'quota_exceeded') return 'You have 50 designs, the most an account can keep. Delete one to make room.'
  if (code !== '23514') return null
  if (message.includes('designs_data_size')) return 'This design is over 2 MB (usually pasted images in diagrams). Remove some to save it.'
  if (message.includes('designs_title_length')) return 'The title is longer than 200 characters.'
  return null
}

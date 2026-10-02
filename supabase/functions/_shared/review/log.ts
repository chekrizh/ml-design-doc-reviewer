// Function logs carry only the result code, the duration and the run id (docs/backend-spec.md §6.1):
// never headers, bodies or keys. Fields outside this list are dropped.
export interface LogFields {
  fn: string
  code: string
  ms: number
  run_id?: string
}

export function logLine(fields: LogFields & Record<string, unknown>): string {
  const { fn, code, ms, run_id } = fields
  return JSON.stringify(run_id ? { fn, code, ms, run_id } : { fn, code, ms })
}

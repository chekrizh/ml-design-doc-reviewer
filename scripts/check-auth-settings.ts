// Checks a cloud project's auth settings after a deploy (D35): Google only, sign-ups open for it, nothing else.
// The dashboard holds these settings, not config.toml, so CI reads them back from the public settings endpoint.
// Run: SUPABASE_URL=https://<ref>.supabase.co SUPABASE_PUBLISHABLE_KEY=... node scripts/check-auth-settings.ts

interface AuthSettings {
  external: Record<string, boolean>
  disable_signup: boolean
}

export function authSettingsProblems(s: AuthSettings): string[] {
  const { google, email, phone, anonymous_users, ...others } = s.external
  const problems: string[] = []
  if (!google) problems.push('Google sign-in is off')
  if (s.disable_signup) problems.push('sign-ups are disabled: new Google users cannot sign in')
  if (email) problems.push('email sign-in is on (the test password account would work in production)')
  if (phone) problems.push('phone sign-in is on')
  if (anonymous_users) problems.push('anonymous sign-in is on')
  const on = Object.entries(others).filter(([, v]) => v).map(([k]) => k)
  if (on.length) problems.push(`other providers are on: ${on.join(', ')}`)
  return problems
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } = process.env
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) throw new Error('Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY')
  const res = await fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_PUBLISHABLE_KEY } })
  if (!res.ok) throw new Error(`auth settings: HTTP ${res.status}`)
  const problems = authSettingsProblems(await res.json())
  if (problems.length) {
    console.error(`Auth settings of ${SUPABASE_URL} are not safe for production:\n- ${problems.join('\n- ')}`)
    process.exit(1)
  }
  console.log(`Auth settings of ${SUPABASE_URL}: Google only, sign-ups open`)
}

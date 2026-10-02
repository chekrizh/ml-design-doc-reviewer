import { describe, expect, it } from 'vitest'
import { authSettingsProblems } from './check-auth-settings'

const prod = {
  external: { google: true, email: false, phone: false, anonymous_users: false, github: false, apple: false },
  disable_signup: false,
}

describe('authSettingsProblems (D35)', () => {
  it('accepts Google-only sign-in with sign-ups open', () => {
    expect(authSettingsProblems(prod)).toEqual([])
  })

  it('names every unsafe or broken setting', () => {
    expect(authSettingsProblems({ external: { ...prod.external, google: false, email: true, anonymous_users: true, github: true }, disable_signup: true })).toEqual([
      'Google sign-in is off',
      'sign-ups are disabled: new Google users cannot sign in',
      'email sign-in is on (the test password account would work in production)',
      'anonymous sign-in is on',
      'other providers are on: github',
    ])
  })
})

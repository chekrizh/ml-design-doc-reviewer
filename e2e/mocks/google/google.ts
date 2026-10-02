/**
 * Google in the browser (docs/backend-spec.md §9): a stub of the Google Identity Services
 * script and an intercepted Drive upload API. Shapes follow developers.google.com:
 * initTokenClient / requestAccessToken / hasGrantedAllScopes, TokenResponse, error_callback { type },
 * Drive multipart upload answering file metadata.
 */
import type { Page } from '@playwright/test'

export type GisOutcome = 'grant' | 'deny' | 'popup_blocked' | 'popup_closed'
export type DriveOutcome = 'ok' | 'fail' | 'unauthorized_once'
export type DriveRequest = { method: string; url: string; kind: 'create' | 'update'; contentType: string; body: string }

// Drive answers browser calls with CORS headers, like the real API.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
}

const gisScript = (outcome: GisOutcome) => `
(() => {
  const outcome = ${JSON.stringify(outcome)};
  let issued = 0;
  window.google = window.google || {};
  window.google.accounts = window.google.accounts || {};
  window.google.accounts.oauth2 = {
    initTokenClient(config) {
      return {
        requestAccessToken() {
          setTimeout(() => {
            if (outcome === 'popup_blocked') return config.error_callback && config.error_callback({ type: 'popup_failed_to_open', message: 'Failed to open popup window' });
            if (outcome === 'popup_closed') return config.error_callback && config.error_callback({ type: 'popup_closed', message: 'Popup window closed' });
            if (outcome === 'deny') return config.callback({ error: 'access_denied', error_description: 'The user denied access', error_uri: '' });
            issued += 1;
            config.callback({ access_token: 'ya29.mock-token-' + issued, expires_in: 3599, token_type: 'Bearer', scope: config.scope, prompt: 'consent' });
          }, 10);
        },
      };
    },
    hasGrantedAllScopes(token, ...scopes) {
      const granted = (token && token.scope ? token.scope : '').split(' ');
      return scopes.every((s) => granted.includes(s));
    },
    hasGrantedAnyScope(token, ...scopes) {
      const granted = (token && token.scope ? token.scope : '').split(' ');
      return scopes.some((s) => granted.includes(s));
    },
    revoke(_token, done) { if (done) done(); },
  };
})();`

/** Stubs GIS and Drive for this page; returns the Drive requests as they arrive. */
export async function stubGoogle(page: Page, opts: { gis?: GisOutcome; drive?: DriveOutcome } = {}) {
  const { gis = 'grant', drive = 'ok' } = opts
  const requests: DriveRequest[] = []
  let unauthorizedSent = false

  await page.route('https://accounts.google.com/gsi/client*', (route) =>
    route.fulfill({ status: 200, contentType: 'text/javascript', body: gisScript(gis) }),
  )
  await page.route('https://www.googleapis.com/upload/drive/v3/files**', async (route) => {
    const req = route.request()
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS })
    const url = req.url()
    const kind = req.method() === 'POST' && new URL(url).pathname === '/upload/drive/v3/files' ? 'create' : 'update'
    requests.push({ method: req.method(), url, kind, contentType: (await req.headerValue('content-type')) ?? '', body: req.postData() ?? '' })
    if (drive === 'fail') return route.fulfill({ status: 500, headers: CORS, json: { error: { code: 500, message: 'Internal Error', errors: [{ domain: 'global', reason: 'backendError', message: 'Internal Error' }] } } })
    if (drive === 'unauthorized_once' && !unauthorizedSent) {
      unauthorizedSent = true
      return route.fulfill({ status: 401, headers: CORS, json: { error: { code: 401, message: 'Request had invalid authentication credentials.', status: 'UNAUTHENTICATED' } } })
    }
    const id = `mock-doc-${requests.length}`
    return route.fulfill({ status: 200, headers: CORS, json: { id, webViewLink: `https://docs.google.com/document/d/${id}/edit?usp=drivesdk` } })
  })
  return requests
}

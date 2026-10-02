// Export to Google Docs (D17, docs/backend-spec.md §8): Google Identity Services asks for drive.file in the
// browser, the document's HTML is uploaded to Drive and converted to a Google Doc. No backend, no stored tokens.
import { create } from 'zustand'
import { googleClientId } from '../backend/env'
import type { Design, SectionId } from '../model/design'
import { diagramNonEmpty } from '../model/rules'
import { showToast } from '../ui/toast'
import { designToHtml } from './html'
import { diagramToPng } from './png'

const GIS_SRC = 'https://accounts.google.com/gsi/client'
const SCOPE = 'https://www.googleapis.com/auth/drive.file'
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink'

export interface LastExport {
  url: string
  at: string
}

/** The open design's last export, shown in Share ('Last exported …'). Set by whoever opens the design. */
export const useLastExport = create<{ last: LastExport | null }>(() => ({ last: null }))

interface TokenResponse {
  access_token?: string
  expires_in?: number
  error?: string
}
interface Gis {
  accounts: {
    oauth2: {
      initTokenClient(c: object): { requestAccessToken(): void }
      hasGrantedAllScopes(t: TokenResponse, ...scopes: string[]): boolean
    }
  }
}

class ExportError extends Error {
  constructor(readonly kind: 'denied' | 'popup_blocked' | 'drive' | 'unavailable') {
    super(kind)
  }
}

let gis: Promise<Gis> | null = null
/** The GIS script loads on the first export only. */
function loadGis(): Promise<Gis> {
  gis ??= new Promise<Gis>((resolve, reject) => {
    const s = document.createElement('script')
    s.src = GIS_SRC
    s.async = true
    s.onload = () => resolve((window as unknown as { google: Gis }).google)
    s.onerror = () => {
      gis = null
      reject(new ExportError('unavailable'))
    }
    document.head.append(s)
  })
  return gis
}

/** The access token lives only in memory, until it expires. */
let token: { value: string; until: number } | null = null

async function getToken(fresh = false): Promise<string> {
  if (!fresh && token && token.until > Date.now()) return token.value
  const google = await loadGis()
  return new Promise<string>((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: googleClientId(),
      scope: SCOPE,
      include_granted_scopes: true,
      callback: (t: TokenResponse) => {
        if (t.error || !t.access_token || !google.accounts.oauth2.hasGrantedAllScopes(t, SCOPE)) return reject(new ExportError('denied'))
        token = { value: t.access_token, until: Date.now() + ((t.expires_in ?? 3600) - 60) * 1000 }
        resolve(t.access_token)
      },
      error_callback: (e: { type?: string }) => reject(new ExportError(e?.type === 'popup_failed_to_open' ? 'popup_blocked' : 'denied')),
    })
    client.requestAccessToken()
  })
}

async function upload(accessToken: string, title: string, html: string): Promise<Response> {
  const boundary = `mlsd-${crypto.randomUUID()}`
  const meta = JSON.stringify({ name: title || 'Untitled design', mimeType: 'application/vnd.google-apps.document' })
  const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n${html}\r\n--${boundary}--`
  return fetch(UPLOAD, { method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': `multipart/related; boundary=${boundary}` }, body })
}

const ERROR_TEXT = {
  denied: 'Export needs access to the files it creates in your Drive. Nothing was exported.',
  popup_blocked: 'Your browser blocked the Google window. Allow pop-ups for this site and try again.',
  drive: 'Google Drive did not accept the document. Try again in a minute; PDF and Markdown export still work.',
  unavailable: 'Google could not be reached. Check your connection and try again; PDF and Markdown export still work.',
}

/**
 * Creates a new Google Doc from the design (every export is a new file) with status toasts.
 * `onExported` records the link (designs.last_export, or the guest's meta).
 */
export async function exportToGoogleDocs(design: Design, onExported: (e: LastExport) => Promise<void> | void) {
  const retry = () => void exportToGoogleDocs(design, onExported)
  try {
    if (!token || token.until <= Date.now()) showToast({ kind: 'progress', text: 'Continue in the Google window to let the app create the Doc.' })
    let access = await getToken()
    showToast({ kind: 'progress', text: 'Exporting to Google Docs…', detail: 'drawing diagrams' })
    const pngs: Partial<Record<SectionId, string>> = {}
    for (const s of design.sections) if (diagramNonEmpty(s.diagram)) pngs[s.id] = await diagramToPng(s.diagram)
    const html = designToHtml(design, pngs)
    showToast({ kind: 'progress', text: 'Exporting to Google Docs…', detail: 'uploading' })
    let res = await upload(access, design.title, html)
    // An expired or revoked token: ask once more, then give up.
    if (res.status === 401) {
      token = null
      access = await getToken(true)
      res = await upload(access, design.title, html)
    }
    if (!res.ok) throw new ExportError('drive')
    const { webViewLink } = (await res.json()) as { webViewLink: string }
    const last = { url: webViewLink, at: new Date().toISOString() }
    useLastExport.setState({ last })
    await Promise.resolve(onExported(last)).catch(() => null)
    showToast({
      kind: 'success',
      text: 'Google Doc created',
      actions: [
        { label: 'Open', onClick: () => window.open(webViewLink, '_blank', 'noopener') },
        { label: 'Copy link', onClick: () => void navigator.clipboard?.writeText(webViewLink) },
      ],
    })
  } catch (e) {
    const kind = e instanceof ExportError ? e.kind : 'drive'
    showToast({ kind: 'error', text: ERROR_TEXT[kind], actions: [{ label: 'Try again', onClick: retry }] })
  }
}

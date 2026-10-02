import { create } from 'zustand'
import type { ErrorCode } from '@review/errors.ts'
import { isErrorCode } from '@review/errors.ts'
import type { Finding, FindingStatus, ReviewRun, SectionId } from '@review/types.ts'
import { callFunction } from '../backend/functions'
import { cancelRun, loadFindings, loadRuns, setFindingStatus } from '../backend/findings'
import { listModels, loadSettings, type KeySettings, type ModelList } from '../backend/settings'
import { diagramToPng } from '../export/png'
import { useDesign } from '../store/store'
import { showToast } from '../ui/toast'
import { reviewRequest } from './request'

export type Scope = 'design' | SectionId

/** AI Review state of the signed-in user and of the open cloud design (one store: panel, editor and document share it, AT-34). */
interface ReviewState {
  settings: KeySettings | null
  models: ModelList | null
  settingsOpen: boolean
  /** The open cloud design; null for guests and unsaved Library items. */
  designId: string | null
  findings: Finding[]
  runs: ReviewRun[]
  running: { runId: string; scope: Scope; startedAt: number; abort: AbortController } | null
  error: { code: ErrorCode; scope: Scope; model: string | null } | null
  panelOpen: boolean
  tab: FindingStatus
  /** The expanded finding, shared by the panel, the editor and the document. */
  expanded: string | null
  /** The card highlighted from the panel. */
  highlight: SectionId | null
}

export const useReview = create<ReviewState>(() => ({
  settings: null,
  models: null,
  settingsOpen: false,
  designId: null,
  findings: [],
  runs: [],
  running: null,
  error: null,
  panelOpen: false,
  tab: 'open',
  expanded: null,
  highlight: null,
}))

export const openSettings = () => useReview.setState({ settingsOpen: true })
export const closeSettings = () => useReview.setState({ settingsOpen: false })

/** Reads the key status and model; the model list loads once a key exists (it needs the user's session). */
export async function refreshSettings() {
  const settings = await loadSettings()
  useReview.setState({ settings })
  if (settings.last4 && !useReview.getState().models) useReview.setState({ models: await listModels().catch(() => null) })
}

export const resetReview = () => useReview.setState({ settings: null, models: null, settingsOpen: false })

/** The model a review uses: the user's choice, else the recommended default. */
export const currentModel = (s: Pick<ReviewState, 'settings' | 'models'>) => s.settings?.model ?? s.models?.default ?? null

/** Loads the review of the open cloud design (or clears it when there is none). */
export async function openDesignReview(designId: string | null) {
  useReview.getState().running?.abort.abort()
  useReview.setState({ designId, findings: [], runs: [], running: null, error: null, panelOpen: false, tab: 'open', expanded: null, highlight: null })
  if (!designId) return
  const [findings, runs] = await Promise.all([loadFindings(designId), loadRuns(designId)]).catch(() => [[], []] as [Finding[], ReviewRun[]])
  if (useReview.getState().designId === designId) useReview.setState({ findings, runs })
}

/** Ensures the design exists in the cloud before a review (an unsaved Library item is saved first). */
let ensureDesignId: () => Promise<string | null> = async () => useReview.getState().designId
export const setEnsureDesignId = (fn: () => Promise<string | null>) => (ensureDesignId = fn)

const inScope = (f: Finding, scope: Scope) => scope === 'design' || f.section === scope

/**
 * Runs a review (§5.5): PNGs of the diagrams, the `review` call, then the scope's findings are replaced;
 * on an error the previous findings stay and the panel shows the error.
 */
export async function startReview(scope: Scope) {
  if (useReview.getState().running) return
  const abort = new AbortController()
  const runId = crypto.randomUUID()
  useReview.setState({ running: { runId, scope, startedAt: Date.now(), abort }, error: null, panelOpen: true, tab: 'open', expanded: null })
  const model = currentModel(useReview.getState())
  try {
    const designId = await ensureDesignId()
    if (!designId) throw new Error('no design')
    const body = await reviewRequest(useDesign.getState().design, designId, runId, scope, diagramToPng)
    const res = await callFunction<{ findings: Finding[]; error?: { code: string } }>('review', body, abort.signal)
    if (useReview.getState().running?.runId !== runId) return
    if (res.status === 200) {
      useReview.setState((s) => ({ findings: [...s.findings.filter((f) => !inScope(f, scope)), ...res.body.findings], running: null }))
    } else {
      const code = res.body.error?.code
      // 'canceled': the user canceled; nothing to show.
      useReview.setState({ running: null, error: code === 'canceled' ? null : { code: isErrorCode(code) ? code : 'provider_error', scope, model } })
    }
  } catch (e) {
    if (useReview.getState().running?.runId !== runId) return
    useReview.setState({ running: null, error: abort.signal.aborted ? null : { code: 'provider_error', scope, model } })
    if (!abort.signal.aborted) console.warn('Review failed', e)
  }
  const designId = useReview.getState().designId
  if (designId) useReview.setState({ runs: await loadRuns(designId).catch(() => useReview.getState().runs) })
}

/** Cancel (§5.5): abort the call, mark the run canceled; if the server already finished, read its findings. */
export async function cancelReview() {
  const r = useReview.getState().running
  if (!r) return
  useReview.setState({ running: null })
  r.abort.abort()
  const designId = useReview.getState().designId
  const canceled = await cancelRun(r.runId).catch(() => true)
  if (!designId) return
  const [findings, runs] = await Promise.all([canceled ? Promise.resolve(useReview.getState().findings) : loadFindings(designId), loadRuns(designId)])
  useReview.setState({ findings, runs })
}

/** Resolve, Dismiss or Reopen: optimistic in the store, then saved; a failure rolls back (§5.5). */
export async function changeStatus(id: string, status: FindingStatus) {
  const before = useReview.getState().findings
  useReview.setState({ findings: before.map((f) => (f.id === id ? { ...f, status, status_changed_at: new Date().toISOString() } : f)) })
  try {
    await setFindingStatus(id, status)
  } catch {
    useReview.setState({ findings: before })
    showToast({ kind: 'error', text: 'The status could not be saved. Please try again.' })
  }
}

export const lastRunAt = (runs: ReviewRun[]) => runs.find((r) => r.status === 'succeeded')?.finished_at ?? null

import { create } from 'zustand'
import { listModels, loadSettings, type KeySettings, type ModelList } from '../backend/settings'

/** AI Review state of the signed-in user. Findings and runs of the open design join it in m2-review-06. */
interface ReviewState {
  settings: KeySettings | null
  models: ModelList | null
  settingsOpen: boolean
}

export const useReview = create<ReviewState>(() => ({ settings: null, models: null, settingsOpen: false }))

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
export const currentModel = (s: ReviewState) => s.settings?.model ?? s.models?.default ?? null

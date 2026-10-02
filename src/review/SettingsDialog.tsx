import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../backend/auth'
import { deleteKey, saveKey, setModel } from '../backend/settings'
import { confirmDialog } from '../dialogs'
import { closeSettings, currentModel, refreshSettings, useReview } from './store'

const field = 'w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100'
const primary = 'rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60'
const secondary = 'rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-slate-50'

/** 'AI Review settings' (docs/mockups/review-run.html, AT-31): the OpenRouter key and the model. */
export function SettingsDialog({ onReview }: { onReview?: () => void }) {
  const open = useReview((s) => s.settingsOpen)
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current!
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog ref={ref} aria-labelledby="settings-title" onClose={closeSettings} className="m-auto w-full max-w-lg rounded-2xl bg-white p-6 text-slate-700 shadow-lg backdrop:bg-slate-900/30">
      {open && <Settings onReview={onReview} />}
    </dialog>
  )
}

function Settings({ onReview }: { onReview?: () => void }) {
  const settings = useReview((s) => s.settings)
  const hasKey = !!settings?.last4
  const [replacing, setReplacing] = useState(false)
  useEffect(() => {
    void refreshSettings()
  }, [])
  return (
    <>
      <div className="flex items-center">
        <h2 id="settings-title" className="font-semibold text-slate-900">
          AI Review settings
        </h2>
        <button type="button" onClick={closeSettings} aria-label="Close" className="ml-auto rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
          ✕
        </button>
      </div>
      <p className="mt-1 text-sm text-slate-500">Reviews run on your OpenRouter account. You pay OpenRouter directly; set a spending limit on the key there.</p>
      <div className="mt-5 flex flex-col gap-5">
        {hasKey && !replacing ? <SavedKey onReplace={() => setReplacing(true)} /> : <KeyInput onSaved={() => setReplacing(false)} />}
        <ModelPicker disabled={!hasKey} />
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button type="button" className={secondary} onClick={closeSettings}>
            Close
          </button>
          {hasKey && onReview && (
            <button
              type="button"
              className={primary}
              onClick={() => {
                closeSettings()
                onReview()
              }}
            >
              Review whole design
            </button>
          )}
        </div>
      </div>
    </>
  )
}

function SavedKey({ onReplace }: { onReplace: () => void }) {
  const s = useReview((x) => x.settings)!
  const remove = async () => {
    if (!(await confirmDialog('Delete your OpenRouter key? AI review stops working until you add a key again.', 'Delete'))) return
    await deleteKey()
    await refreshSettings()
  }
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-slate-900">OpenRouter key</span>
      <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm">
        <span data-testid="saved-key" className="font-mono text-slate-700">
          sk-or-v1-••••••••{s.last4}
        </span>
        <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">✓ Works</span>
        <button type="button" onClick={onReplace} className="ml-auto text-sm font-semibold text-indigo-600 hover:text-indigo-700">
          Replace
        </button>
        <button type="button" onClick={() => void remove()} className="text-sm font-semibold text-red-600 hover:text-red-700">
          Delete
        </button>
      </div>
      {s.addedAt && <p className="text-xs text-slate-500">Added {new Date(s.addedAt).toLocaleDateString('en-US', { dateStyle: 'medium' })}.</p>}
    </div>
  )
}

function KeyInput({ onSaved }: { onSaved: () => void }) {
  const [key, setKey] = useState('')
  const [state, setState] = useState<'idle' | 'checking' | 'rejected' | 'failed'>('idle')
  const save = async () => {
    setState('checking')
    const res = await saveKey(key.trim())
    if (res.ok) {
      setKey('')
      setState('idle')
      await refreshSettings()
      onSaved()
    } else setState(res.code === 'key_rejected' || res.code === 'invalid_key_format' ? 'rejected' : 'failed')
  }
  const bad = state === 'rejected'
  return (
    <form
      className="flex flex-col gap-1.5"
      onSubmit={(e) => {
        e.preventDefault()
        if (key.trim()) void save()
      }}
    >
      <label htmlFor="openrouter-key" className="text-sm font-medium text-slate-900">
        OpenRouter key
      </label>
      <div className="flex gap-2">
        <input
          id="openrouter-key"
          type="password"
          autoComplete="off"
          value={key}
          disabled={state === 'checking'}
          aria-invalid={bad}
          placeholder="sk-or-v1-…"
          onChange={(e) => {
            setKey(e.target.value)
            if (state !== 'checking') setState('idle')
          }}
          className={`${field} font-mono ${bad ? 'border-red-300 focus:border-red-300 focus:ring-red-100' : ''} ${state === 'checking' ? 'bg-slate-50 text-slate-400' : ''}`}
        />
        <button type="submit" disabled={state === 'checking' || !key.trim()} className={`${primary} shrink-0`}>
          {state === 'checking' ? 'Checking…' : 'Save'}
        </button>
      </div>
      {bad ? (
        <p className="text-xs font-medium text-red-600">OpenRouter rejected this key. Check that you copied all of it, or create a new one.</p>
      ) : state === 'failed' ? (
        <p className="text-xs font-medium text-red-600">The key could not be checked: OpenRouter did not answer. Try again in a minute.</p>
      ) : (
        <p className="text-xs text-slate-500">
          Create one at <span className="font-medium text-slate-700 select-all">openrouter.ai/keys</span>. Stored encrypted; the app uses it for reviews and never shows it again.
        </p>
      )}
    </form>
  )
}

function ModelPicker({ disabled }: { disabled: boolean }) {
  const models = useReview((s) => s.models)
  const selected = useReview(currentModel)
  const userId = useAuth((s) => s.account?.id)
  const change = async (model: string) => {
    useReview.setState((s) => ({ settings: s.settings && { ...s.settings, model } }))
    await setModel(userId!, model).catch(() => refreshSettings())
  }
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="review-model" className="text-sm font-medium text-slate-900">
        Model
      </label>
      <div className="relative">
        <select
          id="review-model"
          disabled={disabled || !models}
          value={selected ?? ''}
          onChange={(e) => void change(e.target.value)}
          className={`${field} appearance-none pr-10 ${disabled ? 'bg-slate-50 text-slate-400' : ''}`}
        >
          {!models && <option value="">{disabled ? 'Add a key to choose a model' : 'Loading models…'}</option>}
          {models?.models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.id === models.default ? `${m.name} — Recommended` : m.name}
            </option>
          ))}
        </select>
        <svg className="pointer-events-none absolute top-1/2 right-4 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <path d="M4 6l4 4 4-4" />
        </svg>
      </div>
      <p className="text-xs text-slate-500">Only models that read images and return structured answers are listed: the review needs your diagrams.</p>
    </div>
  )
}

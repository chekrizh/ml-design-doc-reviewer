import { useEffect } from 'react'
import { create } from 'zustand'

/** A background operation's status (docs/design-system.md, 'Уведомление'). One at a time: a new one replaces the old. */
export interface Toast {
  kind: 'success' | 'error' | 'progress'
  text: string
  /** Secondary text after the message, e.g. the current step. */
  detail?: string
  actions?: { label: string; onClick: () => void }[]
}

export const useToast = create<{ toast: Toast | null; id: number }>(() => ({ toast: null, id: 0 }))

export const showToast = (toast: Toast) => useToast.setState((s) => ({ toast, id: s.id + 1 }))
export const dismissToast = () => useToast.setState({ toast: null })

/** Success hides by itself after this long; errors stay until dismissed, progress until replaced. */
const SUCCESS_MS = 8000

const Icon = ({ kind }: { kind: Toast['kind'] }) =>
  kind === 'progress' ? (
    <svg className="h-4 w-4 shrink-0 animate-spin text-indigo-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
      <path d="M12 3a9 9 0 1 0 9 9" strokeLinecap="round" />
    </svg>
  ) : kind === 'success' ? (
    <span aria-hidden className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-600 text-white">
      <svg viewBox="0 0 24 24" className="h-3 w-3">
        <path d="M6 12l4 4 8-8" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  ) : (
    <span aria-hidden className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-red-600 text-[0.6875rem] font-bold text-white">
      !
    </span>
  )

export function Toaster() {
  const { toast, id } = useToast()
  useEffect(() => {
    if (toast?.kind !== 'success') return
    const t = setTimeout(() => useToast.getState().id === id && dismissToast(), SUCCESS_MS)
    return () => clearTimeout(t)
  }, [toast, id])
  return (
    <div role="status" aria-live="polite" className="fixed inset-x-4 bottom-6 z-50 mx-auto max-w-md print:hidden">
      {toast && (
        <div data-testid="toast" data-kind={toast.kind} className="flex items-center gap-3 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-lg">
          <Icon kind={toast.kind} />
          <span className="min-w-0 flex-1">
            {toast.text}
            {toast.detail && <span className="text-slate-400"> {toast.detail}</span>}
          </span>
          {toast.actions?.map((a) => (
            <button key={a.label} type="button" onClick={a.onClick} className="text-sm font-semibold whitespace-nowrap text-indigo-300 hover:text-indigo-200">
              {a.label}
            </button>
          ))}
          {toast.kind !== 'progress' && (
            <button type="button" aria-label="Dismiss" onClick={dismissToast} className="ml-1 shrink-0 rounded-md px-1 text-slate-400 hover:text-white">
              ✕
            </button>
          )}
        </div>
      )}
    </div>
  )
}

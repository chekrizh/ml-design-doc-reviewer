import { useState } from 'react'

/** Text that turns into an input on click. Enter or blur saves, Escape cancels. */
export function InlineText({
  value,
  onSave,
  placeholder,
  className = '',
  inputClassName = '',
  label,
  wrap = false,
  maxLength,
}: {
  value: string
  onSave: (v: string) => void
  placeholder: string
  className?: string
  inputClassName?: string
  label: string
  /** Wrap long text onto several lines instead of cutting it with an ellipsis. */
  wrap?: boolean
  maxLength?: number
}) {
  const [draft, setDraft] = useState<string | null>(null)
  if (draft === null)
    return (
      <button
        type="button"
        aria-label={`Edit ${label}`}
        onClick={() => setDraft(value)}
        className={`min-w-0 cursor-text text-left ${wrap ? 'break-words whitespace-normal' : 'truncate'} ${value ? '' : 'text-slate-400'} ${className}`}
      >
        {value || placeholder}
      </button>
    )
  const save = () => {
    if (draft !== value) onSave(draft)
    setDraft(null)
  }
  return (
    <input
      autoFocus
      aria-label={label}
      value={draft}
      maxLength={maxLength}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === 'Enter') save()
        if (e.key === 'Escape') {
          e.stopPropagation()
          setDraft(null)
        }
      }}
      className={`min-w-0 rounded border border-indigo-300 bg-white px-1 outline-none ${inputClassName}`}
    />
  )
}

import { createContext, use, useId, useRef, type ReactNode } from 'react'

const MenuContext = createContext('')

/**
 * A button with a popover menu. The native Popover API closes it on outside click and Escape;
 * items built with `MenuItem` close it too.
 */
export function Menu({
  label,
  button,
  className,
  children,
}: {
  label: string
  button: ReactNode
  className: string
  children: ReactNode
}) {
  const id = useId()
  const anchor = useRef<HTMLButtonElement>(null)
  const pop = useRef<HTMLDivElement>(null)
  return (
    <>
      <button ref={anchor} type="button" aria-label={label} aria-haspopup="menu" popoverTarget={id} className={className}>
        {button}
      </button>
      <div
        ref={pop}
        id={id}
        popover="auto"
        role="menu"
        aria-label={label}
        // Top layer: place it under the button, right-aligned.
        onBeforeToggle={(e) => {
          if (e.newState !== 'open') return
          const r = anchor.current!.getBoundingClientRect()
          pop.current!.style.top = `${r.bottom + 6}px`
          pop.current!.style.right = `${document.documentElement.clientWidth - r.right}px`
        }}
        className="fixed inset-auto m-0 min-w-44 rounded-xl border border-slate-200 bg-white p-1 text-sm shadow-lg"
      >
        <MenuContext value={id}>{children}</MenuContext>
      </div>
    </>
  )
}

export function MenuItem({ onClick, children, className }: { onClick: () => void; children: ReactNode; className?: string }) {
  return (
    <button type="button" role="menuitem" popoverTarget={use(MenuContext)} popoverTargetAction="hide" onClick={onClick} className={className ?? 'flex w-full items-center rounded-lg px-3 py-2 text-left font-medium hover:bg-slate-100'}>
      {children}
    </button>
  )
}

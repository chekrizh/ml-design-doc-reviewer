/**
 * In-app replacements for window.alert / confirm / prompt, styled per docs/design-system.md.
 * A native <dialog> gives focus trapping, Escape-to-cancel and the backdrop for free.
 * role="alertdialog" keeps it apart from the Component Editor's role="dialog".
 */
const btn = 'rounded-lg px-3 py-1.5 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-indigo-400'

function open(message: string, ok: string, cancel: string | null, input: boolean, title?: string): Promise<string | null> {
  const d = document.createElement('dialog')
  d.setAttribute('role', 'alertdialog')
  d.setAttribute('aria-label', title ?? message)
  d.className = 'm-auto w-full max-w-md rounded-2xl bg-white p-6 text-slate-700 shadow-lg backdrop:bg-slate-900/30'

  const form = document.createElement('form')
  form.method = 'dialog'
  if (title) {
    const h = document.createElement('h2')
    h.className = 'mb-2 font-semibold text-slate-900'
    h.textContent = title
    form.append(h)
  }
  const p = document.createElement('p')
  p.className = 'text-sm'
  p.textContent = message
  form.append(p)

  const field = document.createElement('input')
  if (input) {
    field.setAttribute('aria-label', message)
    field.className =
      'mt-4 w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100'
    form.append(field)
  }

  // OK comes first in the DOM so Enter submits it; flex-row-reverse puts it on the right.
  const row = document.createElement('div')
  row.className = 'mt-6 flex flex-row-reverse gap-2'
  const okBtn = Object.assign(document.createElement('button'), { value: 'ok', textContent: ok })
  okBtn.className = `${btn} bg-slate-900 text-white hover:bg-slate-700`
  row.append(okBtn)
  if (cancel) {
    const no = Object.assign(document.createElement('button'), { value: 'cancel', textContent: cancel })
    no.className = `${btn} border border-slate-200 bg-white text-slate-900 hover:bg-slate-50`
    row.append(no)
  }
  form.append(row)
  d.append(form)

  return new Promise((resolve) => {
    d.addEventListener('close', () => {
      d.remove()
      resolve(d.returnValue === 'ok' ? field.value : null)
    })
    document.body.append(d)
    d.showModal()
  })
}

export const confirmDialog = (message: string, ok = 'OK', title?: string) => open(message, ok, 'Cancel', false, title).then((v) => v !== null)
export const alertDialog = (message: string) => open(message, 'OK', null, false).then(() => undefined)
export const promptDialog = (message: string) => open(message, 'OK', 'Cancel', true)

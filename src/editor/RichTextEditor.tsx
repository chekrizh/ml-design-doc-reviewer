import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import type { RichText } from '../model/design'

const btn = (active: boolean) =>
  `rounded px-2 py-1 text-sm ${active ? 'bg-violet-100 text-violet-700' : 'text-slate-500 hover:bg-slate-100'}`

/** TipTap editor for Rationale & Notes, shared by the Component Editor and the Document. */
export function RichTextEditor({
  value,
  onChange,
  label,
  bare = false,
}: {
  value: RichText | null
  onChange: (v: RichText) => void
  label: string
  /** Document mode: no frame, toolbar only while editing. */
  bare?: boolean
}) {
  const editor = useEditor({
    extensions: [StarterKit.configure({ link: { openOnClick: false } })],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getJSON() as RichText),
    editorProps: {
      attributes: {
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': label,
        class: `prose-rt outline-none ${bare ? '' : 'min-h-24 px-4 py-3'}`,
      },
    },
  })
  const active = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      code: e.isActive('code'),
      bullet: e.isActive('bulletList'),
      ordered: e.isActive('orderedList'),
      link: e.isActive('link'),
    }),
  })
  const chain = () => editor.chain().focus()
  const setLink = () => {
    if (active.link) return chain().unsetLink().run()
    const href = window.prompt('Link URL')
    if (href) chain().extendMarkRange('link').setLink({ href }).run()
  }

  return (
    <div className={bare ? 'group relative' : 'rounded-xl border border-slate-200 bg-white'}>
      <div
        role="toolbar"
        aria-label="Formatting"
        // Keep focus and selection in the editor while using the toolbar.
        onMouseDown={(e) => e.preventDefault()}
        className={`flex items-center gap-1 px-2 py-1 print:hidden ${bare ? 'absolute -top-10 left-0 z-10 hidden rounded-lg border border-slate-200 bg-white shadow group-focus-within:flex' : 'border-b border-slate-100'}`}
      >
        <button type="button" aria-label="Bold" className={`${btn(active.bold)} font-bold`} onClick={() => chain().toggleBold().run()}>B</button>
        <button type="button" aria-label="Italic" className={`${btn(active.italic)} italic`} onClick={() => chain().toggleItalic().run()}>I</button>
        <button type="button" aria-label="Inline code" className={`${btn(active.code)} font-mono`} onClick={() => chain().toggleCode().run()}>{'<>'}</button>
        <span className="mx-1 h-4 w-px bg-slate-200" />
        <button type="button" aria-label="Bullet list" className={btn(active.bullet)} onClick={() => chain().toggleBulletList().run()}>•≡</button>
        <button type="button" aria-label="Ordered list" className={btn(active.ordered)} onClick={() => chain().toggleOrderedList().run()}>1.</button>
        <span className="mx-1 h-4 w-px bg-slate-200" />
        <button type="button" aria-label="Link" className={btn(active.link)} onClick={setLink}>🔗</button>
        <span title="Coming soon" className="inline-flex">
          <button type="button" aria-label="Image (coming soon)" disabled className={`${btn(false)} cursor-not-allowed opacity-40`}>🖼</button>
        </span>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}

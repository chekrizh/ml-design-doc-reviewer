import JSZip from 'jszip'
import type { Design } from '../model/design'
import { diagramNonEmpty, sectionEmpty } from '../model/rules'
import { designToMarkdown, imagePath, slugify } from './markdown'
import { diagramToSvg } from './svg'
import { confirmDialog } from '../dialogs'

const save = (blob: Blob, name: string) => {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

/** Warns about empty sections; returns false if the user cancels. */
export async function confirmEmptySections(d: Design): Promise<boolean> {
  const empty = d.sections.filter(sectionEmpty).length
  if (!empty) return true
  return confirmDialog(
    `${empty} of ${d.sections.length} sections are empty and will not be exported. Continue?`,
    'Export anyway',
  )
}

/** One .md without diagrams, otherwise a .zip with the .md and images/*.svg. */
export async function exportMarkdown(d: Design) {
  const slug = slugify(d.title)
  const md = designToMarkdown(d)
  const withDiagrams = d.sections.filter((s) => diagramNonEmpty(s.diagram))
  if (!withDiagrams.length) return save(new Blob([md], { type: 'text/markdown' }), `${slug}.md`)
  const zip = new JSZip()
  zip.file(`${slug}.md`, md)
  for (const s of withDiagrams) zip.file(imagePath(s), await diagramToSvg(s.diagram))
  save(await zip.generateAsync({ type: 'blob' }), `${slug}.zip`)
}

import { Excalidraw } from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'
import { useRef, useState } from 'react'
import type { SectionId } from '../model/design'
import { useDesign } from '../store/store'

const signature = (elements: readonly { id: string; version: number; isDeleted: boolean }[]) =>
  elements.map((e) => `${e.id}:${e.version}:${e.isDeleted}`).join()

/** Excalidraw whiteboard of one section. Loaded lazily by the Component Editor. */
export default function Whiteboard({ sid }: { sid: SectionId }) {
  // Excalidraw owns the scene while open; the store only receives its changes.
  const [initial] = useState(() => useDesign.getState().design.sections.find((s) => s.id === sid)!.diagram)
  const last = useRef(signature(initial.elements as never))

  return (
    <div className="h-[min(26rem,60dvh)] overflow-hidden rounded-xl border border-slate-200" data-testid="whiteboard">
      <Excalidraw
        initialData={{ elements: initial.elements as never, files: initial.files as never, scrollToContent: true }}
        UIOptions={{ canvasActions: { loadScene: false, saveToActiveFile: false, export: false, saveAsImage: false } }}
        onChange={(elements, _appState, files) => {
          const sig = signature(elements)
          if (sig === last.current) return
          last.current = sig
          useDesign.getState().setDiagram(sid, {
            elements: elements.filter((e) => !e.isDeleted) as never,
            files: { ...files },
          })
        }}
      />
    </div>
  )
}

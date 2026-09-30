import { create } from 'zustand'
import {
  emptyDesign,
  INITIAL_LAYOUT,
  newId,
  type Design,
  type Diagram,
  type LayoutItem,
  type RichText,
  type Section,
  type SectionId,
  type TradeOffs,
} from '../model/design'

export type SaveState = 'saved' | 'saving'

interface State {
  design: Design
  saveState: SaveState
  setDesign: (design: Design) => void
  setTitle: (title: string) => void
  addKeyProperty: (sid: SectionId) => void
  updateKeyProperty: (sid: SectionId, pid: string, patch: { key?: string; value?: string }) => void
  removeKeyProperty: (sid: SectionId, pid: string) => void
  setRationale: (sid: SectionId, rationale: RichText | null) => void
  addOption: (sid: SectionId) => void
  addCriterion: (sid: SectionId) => void
  renameOption: (sid: SectionId, oid: string, name: string) => void
  renameCriterion: (sid: SectionId, cid: string, name: string) => void
  setCell: (sid: SectionId, oid: string, cid: string, text: string) => void
  removeOption: (sid: SectionId, oid: string) => void
  removeCriterion: (sid: SectionId, cid: string) => void
  chooseOption: (sid: SectionId, oid: string | null) => void
  setDiagram: (sid: SectionId, diagram: Diagram) => void
  setLayout: (layout: LayoutItem[]) => void
  resetLayout: () => void
  setSaveState: (s: SaveState) => void
}

export const useDesign = create<State>()((set) => {
  const touch = (fn: (d: Design) => Design) => set((s) => ({ design: { ...fn(s.design), updatedAt: Date.now() } }))
  const section = (sid: SectionId, fn: (s: Section) => Section) =>
    touch((d) => ({ ...d, sections: d.sections.map((s) => (s.id === sid ? fn(s) : s)) }))
  const tradeoffs = (sid: SectionId, fn: (t: TradeOffs) => TradeOffs) =>
    section(sid, (s) => ({ ...s, tradeoffs: fn(s.tradeoffs) }))

  return {
    design: emptyDesign(),
    saveState: 'saved',
    setDesign: (design) => set({ design }),
    setTitle: (title) => touch((d) => ({ ...d, title })),
    addKeyProperty: (sid) =>
      section(sid, (s) => ({ ...s, keyProperties: [...s.keyProperties, { id: newId(), key: '', value: '' }] })),
    updateKeyProperty: (sid, pid, patch) =>
      section(sid, (s) => ({
        ...s,
        keyProperties: s.keyProperties.map((p) => (p.id === pid ? { ...p, ...patch } : p)),
      })),
    removeKeyProperty: (sid, pid) =>
      section(sid, (s) => ({ ...s, keyProperties: s.keyProperties.filter((p) => p.id !== pid) })),
    setRationale: (sid, rationale) => section(sid, (s) => ({ ...s, rationale })),
    addOption: (sid) => tradeoffs(sid, (t) => ({ ...t, options: [...t.options, { id: newId(), name: '', cells: {} }] })),
    addCriterion: (sid) => tradeoffs(sid, (t) => ({ ...t, criteria: [...t.criteria, { id: newId(), name: '' }] })),
    renameOption: (sid, oid, name) =>
      tradeoffs(sid, (t) => ({ ...t, options: t.options.map((o) => (o.id === oid ? { ...o, name } : o)) })),
    renameCriterion: (sid, cid, name) =>
      tradeoffs(sid, (t) => ({ ...t, criteria: t.criteria.map((c) => (c.id === cid ? { ...c, name } : c)) })),
    setCell: (sid, oid, cid, text) =>
      tradeoffs(sid, (t) => ({
        ...t,
        options: t.options.map((o) => (o.id === oid ? { ...o, cells: { ...o.cells, [cid]: text } } : o)),
      })),
    removeOption: (sid, oid) =>
      tradeoffs(sid, (t) => ({
        ...t,
        options: t.options.filter((o) => o.id !== oid),
        chosenId: t.chosenId === oid ? null : t.chosenId,
      })),
    removeCriterion: (sid, cid) =>
      tradeoffs(sid, (t) => ({
        ...t,
        criteria: t.criteria.filter((c) => c.id !== cid),
        options: t.options.map((o) => {
          const cells = { ...o.cells }
          delete cells[cid]
          return { ...o, cells }
        }),
      })),
    chooseOption: (sid, oid) => tradeoffs(sid, (t) => ({ ...t, chosenId: oid })),
    setDiagram: (sid, diagram) => section(sid, (s) => ({ ...s, diagram })),
    setLayout: (layout) => touch((d) => ({ ...d, layout })),
    resetLayout: () => touch((d) => ({ ...d, layout: INITIAL_LAYOUT.map((l) => ({ ...l })) })),
    setSaveState: (saveState) => set({ saveState }),
  }
})

export const useSection = (sid: SectionId) => useDesign((s) => s.design.sections.find((x) => x.id === sid)!)

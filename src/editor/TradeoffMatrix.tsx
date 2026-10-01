import type { SectionId } from '../model/design'
import { useDesign, useSection } from '../store/store'

const cellInput = 'w-full min-w-20 rounded bg-transparent px-2 py-1 outline-none focus:bg-white focus:ring-1 focus:ring-indigo-300'

/** Editable trade-off matrix: rows are options, columns are criteria, one option can be chosen. */
export function TradeoffMatrix({ sid, editable = true }: { sid: SectionId; editable?: boolean }) {
  const { options, criteria, chosenId } = useSection(sid).tradeoffs
  const a = useDesign.getState()

  return (
    <div>
      {editable && (
        <div className="mb-3 flex justify-end gap-2 print:hidden">
          <button type="button" onClick={() => a.addOption(sid)} className="rounded-full border border-slate-200 px-3 py-1 text-sm font-medium hover:bg-slate-50">
            Add Option (Row)
          </button>
          <button type="button" onClick={() => a.addCriterion(sid)} className="rounded-full border border-slate-200 px-3 py-1 text-sm font-medium hover:bg-slate-50">
            Add Criteria (Col)
          </button>
        </div>
      )}
      {(options.length > 0 || criteria.length > 0) && (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table aria-label="Trade-off matrix" className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Option</th>
                {criteria.map((c, j) => (
                  <th key={c.id} className="px-1 py-1 font-medium">
                    <div className="flex items-center">
                      <input aria-label={`Criterion ${j + 1} name`} placeholder="Criterion" value={c.name} onChange={(e) => a.renameCriterion(sid, c.id, e.target.value)} className={`${cellInput} uppercase`} />
                      {editable && (
                        <button type="button" aria-label={`Delete criterion ${j + 1}`} onClick={() => a.removeCriterion(sid, c.id)} className="px-1 text-slate-400 hover:text-red-500 print:hidden">
                          ×
                        </button>
                      )}
                    </div>
                  </th>
                ))}
                {editable && <th className="w-16 px-3 py-2 text-center font-medium print:hidden">Action</th>}
              </tr>
            </thead>
            <tbody>
              {options.map((o, i) => {
                const chosen = o.id === chosenId
                return (
                  <tr key={o.id} data-chosen={chosen} className={`border-t border-slate-100 ${chosen ? 'bg-indigo-50' : ''}`}>
                    <td className="px-1 py-1">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          aria-label={`Choose option ${i + 1}`}
                          aria-pressed={chosen}
                          title={chosen ? 'Chosen option' : 'Mark as chosen'}
                          onClick={() => a.chooseOption(sid, chosen ? null : o.id)}
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs ${chosen ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 text-transparent hover:border-indigo-400'}`}
                        >
                          ✓
                        </button>
                        <input aria-label={`Option ${i + 1} name`} placeholder="Option" value={o.name} onChange={(e) => a.renameOption(sid, o.id, e.target.value)} className={`${cellInput} ${chosen ? 'font-semibold text-indigo-700' : ''}`} />
                        {chosen && <span className="sr-only">(chosen)</span>}
                      </div>
                    </td>
                    {criteria.map((c, j) => (
                      <td key={c.id} className="px-1 py-1">
                        <input aria-label={`Cell ${i + 1},${j + 1}`} value={o.cells[c.id] ?? ''} onChange={(e) => a.setCell(sid, o.id, c.id, e.target.value)} className={cellInput} />
                      </td>
                    ))}
                    {editable && (
                      <td className="text-center print:hidden">
                        <button type="button" aria-label={`Delete option ${i + 1}`} onClick={() => a.removeOption(sid, o.id)} className="px-2 text-slate-400 hover:text-red-500">
                          🗑
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

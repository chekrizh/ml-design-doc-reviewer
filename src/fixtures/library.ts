// Library items: examples and tasks from docs/library/*.md, one file per item (docs/mvp-spec.md, M2).
// The markdown is the single source: it is parsed into a Design at runtime (D31).
import retail from '../../docs/library/retail-demand-forecasting.md?raw'
import superpay from '../../docs/library/superpay-fraud-detection.md?raw'
import type { Design } from '../model/design'
import { itemDesign, parseLibraryItem, type LibraryItem } from './library-parse'

export type { LibraryItem }

export const LIBRARY: LibraryItem[] = Object.entries({
  'retail-demand-forecasting': retail,
  'superpay-fraud-detection': superpay,
}).map(([id, md]) => parseLibraryItem(id, md))

export const libraryItem = (id: string) => LIBRARY.find((i) => i.id === id)

export const libraryDesign = (id: string): Design => itemDesign(libraryItem(id)!)

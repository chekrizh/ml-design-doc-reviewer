import { recordCloudExport, useCloud } from '../backend/cloud'
import { recordLocalExport } from '../store/persist'
import { useDesign } from '../store/store'
import { exportToGoogleDocs } from './gdocs'

/** Exports the open design and records the link where the design lives: the cloud row or the guest's meta. */
export const exportOpenDesignToGoogleDocs = () =>
  exportToGoogleDocs(useDesign.getState().design, (last) =>
    useCloud.getState().id ? recordCloudExport(last) : location.pathname === '/local' ? recordLocalExport(last) : undefined,
  )

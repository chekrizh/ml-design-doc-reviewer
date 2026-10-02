import { SECTIONS, type SectionId } from '@review/types.ts'
import { signInWithGoogle, useAuth } from '../backend/auth'
import { Menu, MenuItem } from '../canvas/Menu'
import { formatEdited } from '../home/edited'
import { currentModel, openSettings, useReview } from './store'

const primary = 'self-start rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700'

/** The AI Review menu (docs/mockups/review-run.html): sign in, add a key, or run a review. */
export function ReviewMenu({ className, onRun, lastRunAt }: { className: string; onRun: (scope: 'design' | SectionId) => void; lastRunAt?: string | null }) {
  const signedIn = useAuth((s) => !!s.account)
  const settings = useReview((s) => s.settings)
  const models = useReview((s) => s.models)
  const model = useReview(currentModel)
  const modelName = models?.models.find((m) => m.id === model)?.name ?? model
  return (
    <Menu label="AI Review" button="AI Review" className={className}>
      <div className="w-72">
        {!signedIn ? (
          <div className="flex flex-col gap-3 p-3">
            <p className="font-medium text-slate-900">Sign in to run AI review</p>
            <p className="font-normal text-slate-500">The review checks your design against the ML System Design rubric and leaves findings on the fields. It runs on your own OpenRouter key.</p>
            <button type="button" className={primary} onClick={() => void signInWithGoogle()}>
              Sign in with Google
            </button>
          </div>
        ) : !settings?.last4 ? (
          <div className="flex flex-col gap-3 p-3">
            <p className="font-medium text-slate-900">Add your OpenRouter key</p>
            <p className="font-normal text-slate-500">Reviews run on your OpenRouter account. Add a key once, then run a review from here.</p>
            <MenuItem onClick={openSettings} className={primary}>
              Add key
            </MenuItem>
          </div>
        ) : (
          <>
            <MenuItem onClick={() => onRun('design')}>Review whole design</MenuItem>
            <div className="px-3 pt-2 pb-1 text-xs tracking-wide text-slate-400 uppercase">Review one section</div>
            <div role="group" aria-label="Review one section">
              {SECTIONS.map(([id, name]) => (
                <MenuItem key={id} onClick={() => onRun(id)}>
                  <span className="font-normal text-slate-700">{name}</span>
                </MenuItem>
              ))}
            </div>
            <div className="mt-1 flex items-center gap-2 border-t border-slate-100 px-3 py-2 text-xs text-slate-500">
              <span>
                {modelName}
                {lastRunAt && ` · last run ${formatEdited(new Date(lastRunAt)).toLowerCase()}`}
              </span>
              <MenuItem onClick={openSettings} className="ml-auto w-auto p-0 text-xs font-semibold text-indigo-600 hover:bg-transparent hover:text-indigo-700">
                Settings
              </MenuItem>
            </div>
          </>
        )}
      </div>
    </Menu>
  )
}

import { signInWithGoogle, signOut, useAuth } from '../backend/auth'
import { TestSignIn } from '../backend/TestSignIn'
import { navigate } from '../router'
import { openSettings } from '../review/store'
import { Menu, MenuItem } from './Menu'

const outline = 'flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-slate-50'

/** Avatar and sign-in for guests, Google photo with the account menu when signed in. */
export function Account() {
  const account = useAuth((s) => s.account)
  if (!account)
    return (
      <>
        <img src="/default-avatar.png" alt="Guest" className="mr-1 h-8 w-8 rounded-full object-cover ring-1 ring-slate-200" />
        <button type="button" className={outline} onClick={() => void signInWithGoogle()}>
          <span className="grid h-4 w-4 place-items-center rounded-full border border-slate-300 text-[10px] font-bold text-slate-500">G</span>
          Sign in with Google
        </button>
        <TestSignIn className={outline} />
      </>
    )
  return (
    <Menu
      label="Account menu"
      className="mr-1 rounded-full"
      button={
        account.avatarUrl ? (
          <img src={account.avatarUrl} alt="Google profile photo" referrerPolicy="no-referrer" className="h-8 w-8 rounded-full object-cover" />
        ) : (
          <span title="Google profile photo" className="grid h-8 w-8 place-items-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
            {(account.name || account.email).slice(0, 1).toUpperCase()}
          </span>
        )
      }
    >
      <div className="px-3 py-2">
        <div className="text-xs text-slate-500">Signed in as</div>
        <div className="font-medium text-slate-900">{account.email}</div>
      </div>
      <div className="my-1 border-t border-slate-100" />
      <MenuItem onClick={() => navigate('/')}>My designs</MenuItem>
      <MenuItem onClick={openSettings}>AI Review settings</MenuItem>
      <div className="my-1 border-t border-slate-100" />
      <MenuItem onClick={() => void signOut()}>Sign out</MenuItem>
    </Menu>
  )
}

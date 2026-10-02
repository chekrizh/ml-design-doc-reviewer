import { deleteAccount, useAuth } from '../backend/auth'
import { navigate } from '../router'

/** /privacy: what the app stores and how to remove it (D38; linked from the Google consent screen). */
export function Privacy() {
  const account = useAuth((s) => s.account)
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 text-slate-700 sm:px-6">
      <a
        href="/"
        onClick={(e) => {
          e.preventDefault()
          navigate('/')
        }}
        className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
      >
        ← ML System Design Trainer
      </a>
      <h1 className="mt-6 text-3xl font-bold text-slate-900">Privacy</h1>
      <div className="mt-6 space-y-5 leading-relaxed">
        <p>Without signing in, your design stays in this browser only. Nothing is sent to our servers.</p>
        <section>
          <h2 className="font-semibold text-slate-900">When you sign in with Google we store</h2>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>your Google email, name and profile photo link, to show who is signed in;</li>
            <li>your designs, AI review runs and findings;</li>
            <li>your OpenRouter API key, encrypted (Supabase Vault). It is used only to run reviews you start and is never shown again, only its last 4 characters.</li>
          </ul>
        </section>
        <p>
          A review sends the design text and diagram images to OpenRouter and the model you chose, under your own key and their terms. Export to Google Docs runs in your browser: the Drive access token never reaches our servers and is kept in memory only.
        </p>
        <p>We do not sell data, show ads or use trackers. Data is hosted by Supabase and the app by Vercel.</p>
        <section>
          <h2 className="font-semibold text-slate-900">Deleting your data</h2>
          <p className="mt-2">Delete account below removes your account, designs, reviews and API key for good. Delete a single design from its menu on the home screen.</p>
          {account && (
            // Here, not in the account menu: AT-43 fixes that menu to My designs, AI Review settings, Sign out.
            <button type="button" onClick={() => void deleteAccount()} className="mt-3 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50">
              Delete account {account.email}
            </button>
          )}
        </section>
      </div>
    </main>
  )
}

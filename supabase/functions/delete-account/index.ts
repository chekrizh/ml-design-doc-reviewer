// Deletes the caller's account (D38): the Vault key first (no foreign key reaches it), then the auth user;
// designs, runs, findings and settings go with it by on delete cascade.
import { json, serve } from '../_shared/http.ts'
import { deleteAuthUser, requireUser, rpc } from '../_shared/supabase.ts'

serve('delete-account', async (req) => {
  const user = await requireUser(req)
  await rpc('svc_delete_openrouter_key', { p_user: user.id })
  await deleteAuthUser(user.id)
  return json(req, 200, {})
})

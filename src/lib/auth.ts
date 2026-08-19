import { headers as nextHeaders } from 'next/headers'
import { redirect } from 'next/navigation'

import type { User } from '@/payload-types'
import { isAdmin } from '@/lib/access'
import { payload } from '@/lib/entitlements'

/**
 * Server-side session helpers.
 *
 * Auth is resolved here, in the data layer, on every request that needs it —
 * not in proxy.ts. `proxy` only does cheap redirects for unauthenticated
 * visitors; it is never the thing standing between a user and paid content.
 */

/** The signed-in user, or null. Safe to call in any server component. */
export const getCurrentUser = async (): Promise<User | null> => {
  const p = await payload()
  // Next 16: headers() is async.
  const requestHeaders = await nextHeaders()
  const { user } = await p.auth({ headers: requestHeaders })
  return (user as User | null) ?? null
}

/** Requires a signed-in user, or sends them to sign in and back again. */
export const requireUser = async (returnTo?: string): Promise<User> => {
  const user = await getCurrentUser()
  if (!user) {
    const next = returnTo ? `?next=${encodeURIComponent(returnTo)}` : ''
    redirect(`/login${next}`)
  }
  return user
}

/** Requires an admin. Members get a 404 rather than a 403, so /admin-ish routes don't confirm they exist. */
export const requireAdmin = async (): Promise<User> => {
  const user = await getCurrentUser()
  if (!user || !isAdmin(user)) redirect('/learn')
  return user
}

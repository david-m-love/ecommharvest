import { headers as nextHeaders } from 'next/headers'
import { redirect } from 'next/navigation'

import type { User } from '@/payload-types'
import { isAdmin } from '@/lib/access'
import { type Capability, can } from '@/lib/capabilities'
import { payload } from '@/lib/entitlements'
import { isTopLevelNavigation } from '@/lib/navigation'

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
  const incoming = await nextHeaders()

  /**
   * A link clicked from an email, Slack or a campaign is a cross-site
   * navigation, and Payload throws away the session cookie on those — so every
   * member arriving from a link landed on the login form while holding a valid
   * session. See `lib/navigation.ts` for why relaxing it for a top-level page
   * load, and only that, is safe.
   *
   * A copy rather than the original: the incoming headers are read-only, and
   * nothing downstream should see a header the browser did not send.
   */
  const requestHeaders = new Headers(incoming)
  if (isTopLevelNavigation((name) => requestHeaders.get(name))) {
    requestHeaders.set('Sec-Fetch-Site', 'same-origin')
  }

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

/**
 * Requires one capability, or bounces.
 *
 * Signed out goes to /login with a return path — they may well be allowed in
 * once they authenticate. Signed in but not permitted goes to /learn rather
 * than showing a 403, because a 403 confirms the page exists.
 */
export const requireCapability = async (
  capability: Capability,
  returnTo?: string,
): Promise<User> => {
  const user = await getCurrentUser()
  if (!user) {
    const next = returnTo ? `?next=${encodeURIComponent(returnTo)}` : ''
    redirect(`/login${next}`)
  }
  if (!can(user, capability)) redirect('/learn')
  return user
}

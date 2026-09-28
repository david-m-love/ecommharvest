import { redirect } from 'next/navigation'

import type { User } from '@/payload-types'
import { COMMUNITY_PATH } from '@/lib/community'
import { requireUser } from '@/lib/auth'
import { hasMembership } from '@/lib/entitlements'

/**
 * The one gate every community page goes through.
 *
 * Signed out goes to `/login` with a return path — they may well be a member
 * who is simply not signed in on this device.
 *
 * Signed in without a membership is the interesting case, and it is **not** a
 * redirect to the sales page. `/weekly` and `/join` ship as drafts and stay
 * drafts until somebody publishes them, so sending people there meant sending
 * them to a 404 — the one answer that tells a person nothing at all and gives
 * them nowhere to go. Instead `/community` renders a locked state itself, which
 * cannot 404 because it is the page they already asked for.
 *
 * Called per page rather than from a layout or middleware. There is no layout
 * guard anywhere in this repo, and inventing the convention for four pages would
 * leave the next person two places to look for the rule.
 */
export const memberOrNot = async (
  returnTo: string,
): Promise<{ user: User; isMember: boolean }> => {
  const user = await requireUser(returnTo)
  return { user, isMember: await hasMembership(user) }
}

/**
 * For the pages that have nothing to show a non-member: a thread, the composer,
 * the profile form. They land on `/community`, which explains.
 */
export const requireMember = async (returnTo: string): Promise<User> => {
  const { user, isMember } = await memberOrNot(returnTo)
  if (!isMember) redirect(COMMUNITY_PATH)
  return user
}

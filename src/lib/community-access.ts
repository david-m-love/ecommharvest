import type { Access } from 'payload'

import { isAdmin } from '@/lib/access'
import { can } from '@/lib/capabilities'
import { type MembershipProduct, WEEKLY, liveMembershipWhere } from '@/lib/membership'

/**
 * Who may read the community, as a Payload access rule.
 *
 * Separate from `lib/community.ts` because that file imports the Payload config
 * to get a client, and the collections it would be imported *into* are the
 * Payload config. This one reaches the database through `req.payload`, which is
 * already there, so it adds no import at all.
 *
 * Why this rule has to be right rather than merely present: Payload publishes a
 * REST endpoint for every collection. `/api/threads` answers to anyone with a
 * valid cookie no matter what the pages do — and everybody who has ever asked
 * for a sign-in link has one, because the masterclass flow creates accounts on
 * demand and gives them `roles: ['member']`. A session is not a payment, and a
 * role is not either. The entitlement is the only thing that is.
 */
export const memberCanRead =
  (product: MembershipProduct = WEEKLY): Access =>
  async ({ req }) => {
    const user = req.user
    if (!user) return false
    // Admins and moderators read the room without holding a subscription to it.
    if (isAdmin(user) || can(user, 'community:moderate')) return true

    const result = await req.payload.find({
      collection: 'entitlements',
      limit: 1,
      depth: 0,
      overrideAccess: true, // the where clause *is* the check
      where: liveMembershipWhere(user.id, product),
    })
    return result.totalDocs > 0
  }

import type { CollectionConfig } from 'payload'

import { adminOnly, isAdmin } from '@/lib/access'
import { auditEntitlementChange, auditEntitlementDelete } from '@/lib/audit'

/**
 * The single source of truth for "what has this person paid for".
 *
 * Deliberately decoupled from any payment provider: a manual grant, a Stripe
 * webhook, and a Shopify order all just write a row here. That is what lets
 * access work today with no checkout, and lets us change processors later
 * without touching the access path.
 *
 * A row points at **either** a course (`course`) **or** a subscription
 * (`product`), never both and never neither. Two things being entitlements is
 * not a coincidence to be tidied away into separate tables: they expire the
 * same way, they are revoked the same way, and they are audited by the same
 * hooks. One table, one revocation story.
 *
 * The two date fields mean different things and the difference is the whole
 * design — see `expiresAt` and `revokedAt` below.
 */
export const Entitlements: CollectionConfig = {
  slug: 'entitlements',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['user', 'course', 'product', 'source', 'grantedAt', 'expiresAt', 'revokedAt'],
    group: 'People',
  },
  access: {
    // Members may see their own entitlements; only admins may mint them.
    read: ({ req }) => {
      if (isAdmin(req.user)) return true
      if (!req.user) return false
      return { user: { equals: req.user.id } }
    },
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  // Logged as hooks rather than in each route, so a grant made by clicking
  // around Payload's own admin is recorded identically to an API one.
  hooks: {
    /**
     * Exactly one target, enforced here because the database can no longer do
     * it. A row with neither is an entitlement to nothing, which
     * `hasCourseAccess` and `hasMembership` would both ignore — access silently
     * not granted, which is the kind of bug that gets diagnosed as "the site is
     * broken" three days later. A row with both is two grants sharing one
     * revocation date.
     */
    beforeValidate: [
      ({ data, originalDoc }) => {
        if (!data) return data
        /**
         * Merged with the stored row, not read from `data` alone. A patch that
         * only stamps `revokedAt` carries no `course` and no `product`, and
         * judging that patch on its own contents would reject every revocation
         * in the app.
         */
        const field = (key: 'course' | 'product') => {
          const value = key in data ? data[key] : (originalDoc as Record<string, unknown> | undefined)?.[key]
          return value !== null && value !== undefined && value !== ''
        }
        if (field('course') === field('product')) {
          throw new Error(
            'An entitlement needs either a course or a product, not both and not neither.',
          )
        }
        return data
      },
    ],
    afterChange: [auditEntitlementChange],
    afterDelete: [auditEntitlementDelete],
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
    },
    {
      /**
       * Optional since the membership arrived.
       *
       * It was `required` while a course was the only thing anyone could be
       * entitled to. eCommHarvest Weekly is not a course — it is a subscription
       * to a room and a call — so requiring one here would have forced a
       * pretend Course record to exist purely to hang the membership off. One
       * nullable column is a smaller lie than that.
       *
       * The `oneTarget` hook below enforces what the database no longer can:
       * exactly one of `course` or `product`.
       */
      name: 'course',
      type: 'relationship',
      relationTo: 'courses',
      index: true,
      admin: { description: 'For course access. Leave blank for a membership.' },
    },
    {
      name: 'product',
      type: 'select',
      index: true,
      options: [{ label: 'eCommHarvest Weekly', value: 'weekly' }],
      admin: { description: 'For a membership. Leave blank for course access.' },
    },
    {
      name: 'source',
      type: 'select',
      required: true,
      defaultValue: 'manual',
      options: [
        { label: 'Manual grant', value: 'manual' },
        { label: 'Stripe', value: 'stripe' },
        { label: 'Shopify', value: 'shopify' },
        { label: 'Masterclass attendee', value: 'masterclass' },
      ],
    },
    {
      name: 'sourceReference',
      type: 'text',
      admin: { description: 'Stripe session id, Shopify order id, or a note.' },
    },
    {
      name: 'grantedAt',
      type: 'date',
      required: true,
      defaultValue: () => new Date().toISOString(),
    },
    {
      /**
       * When access lapses on its own. **This is where a cancellation goes.**
       *
       * Somebody who cancels on day 3 of a month they have paid for keeps what
       * they bought until day 30, so cancelling sets this to the end of the
       * paid period and touches nothing else. It is also what a renewal moves
       * forward, which makes a missed payment webhook self-healing: access
       * simply lapses instead of persisting until somebody notices.
       */
      name: 'expiresAt',
      type: 'date',
      admin: {
        description:
          'Access ends on this date. This is where a cancellation goes — set it to the end of the period they have paid for. Blank means it never lapses.',
      },
    },
    {
      /**
       * Immediate termination, and nothing else. A refund, a chargeback, or
       * somebody being removed from the room. Not cancellation — see above.
       */
      name: 'revokedAt',
      type: 'date',
      admin: {
        description:
          'Cuts access off immediately: refunds, chargebacks, removal. Not for cancellations. Stamped rather than deleted so the history survives a dispute.',
      },
    },
  ],
}

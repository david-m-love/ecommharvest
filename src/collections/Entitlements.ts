import type { CollectionConfig } from 'payload'

import { adminOnly, isAdmin } from '@/lib/access'
import { auditEntitlementChange, auditEntitlementDelete } from '@/lib/audit'

/**
 * The single source of truth for "may this person watch this course".
 *
 * Deliberately decoupled from any payment provider: a manual grant, a Stripe
 * webhook, and a Shopify order all just write a row here. That is what lets
 * access work today with no checkout, and lets us change processors later
 * without touching the access path.
 */
export const Entitlements: CollectionConfig = {
  slug: 'entitlements',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['user', 'course', 'source', 'grantedAt', 'revokedAt'],
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
      name: 'course',
      type: 'relationship',
      relationTo: 'courses',
      required: true,
      index: true,
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
      name: 'expiresAt',
      type: 'date',
      admin: { description: 'Leave blank for lifetime access.' },
    },
    {
      name: 'revokedAt',
      type: 'date',
      admin: {
        description: 'Set to revoke without deleting, so the history survives a refund dispute.',
      },
    },
  ],
}

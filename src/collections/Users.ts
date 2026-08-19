import type { CollectionConfig } from 'payload'

import { adminOnly, adminOnlyField, adminOrSelf, isAdmin } from '@/lib/access'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    // Members sign in by emailed link; admins use a password. Both live here so
    // one identity works across /learn and /admin.
    tokenExpiration: 60 * 60 * 24 * 30,
    maxLoginAttempts: 10,
    lockTime: 10 * 60 * 1000,
  },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'name', 'roles', 'createdAt'],
    // The whole admin panel is admin-only. Members authenticate against the
    // same collection but are bounced from /admin.
    hidden: ({ user }) => !isAdmin(user),
  },
  access: {
    read: adminOrSelf,
    create: adminOnly,
    update: adminOrSelf,
    delete: adminOnly,
    admin: ({ req }) => isAdmin(req.user),
  },
  fields: [
    { name: 'name', type: 'text' },
    {
      name: 'roles',
      type: 'select',
      hasMany: true,
      required: true,
      defaultValue: ['member'],
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Member', value: 'member' },
      ],
      // Critical: without this a member could PATCH themselves to admin.
      access: { create: adminOnlyField, update: adminOnlyField },
      admin: { description: 'Only admins can change roles.' },
    },
    {
      name: 'stripeCustomerId',
      type: 'text',
      admin: { readOnly: true, position: 'sidebar' },
    },
  ],
}
